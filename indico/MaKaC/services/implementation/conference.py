# -*- coding: utf-8 -*-
##
##
## This file is part of CDS Indico.
## Copyright (C) 2002, 2003, 2004, 2005, 2006, 2007 CERN.
##
## CDS Indico is free software; you can redistribute it and/or
## modify it under the terms of the GNU General Public License as
## published by the Free Software Foundation; either version 2 of the
## License, or (at your option) any later version.
##
## CDS Indico is distributed in the hope that it will be useful, but
## WITHOUT ANY WARRANTY; without even the implied warranty of
## MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
## General Public License for more details.
##
## You should have received a copy of the GNU General Public License
## along with CDS Indico; if not, write to the Free Software Foundation, Inc.,
## 59 Temple Place, Suite 330, Boston, MA 02111-1307, USA.

"""
Asynchronous request handlers for conference-related data modification.
"""

from MaKaC.services.implementation.base import ProtectedModificationService,\
    ListModificationBase, ParameterManager
from MaKaC.services.implementation.base import ProtectedDisplayService, ServiceBase

import MaKaC.webinterface.displayMgr as displayMgr

from MaKaC.common import filters
from MaKaC.common.utils import validMail, setValidEmailSeparators
from MaKaC.common import indexes, info
from MaKaC.common.fossilize import fossilize

from MaKaC.conference import ConferenceHolder
import MaKaC.conference as conference
from MaKaC.services.implementation.base import TextModificationBase
from MaKaC.services.implementation.base import HTMLModificationBase
from MaKaC.services.implementation.base import DateTimeModificationBase
from MaKaC.webinterface.rh.reviewingModif import RCReferee, RCPaperReviewManager
from MaKaC.webinterface.common import contribFilters
import MaKaC.webinterface.wcomponents as wcomponents
import MaKaC.webinterface.urlHandlers as urlHandlers
import MaKaC.common.timezoneUtils as timezoneUtils
from MaKaC.common.contextManager import ContextManager
from MaKaC.user import PrincipalHolder, Avatar, Group

import datetime
from pytz import timezone

from MaKaC.errors import TimingError
from MaKaC.common.logger import Logger
from MaKaC.i18n import _

from MaKaC.services.interface.rpc.common import ServiceError, Warning, \
        ResultWithWarning, TimingNoReportError, NoReportError
from MaKaC.fossils.contribution import IContributionFossil
from indico.modules.scheduler import tasks
from indico.util.i18n import i18nformat
from MaKaC.common.Configuration import Config


class ConferenceBase:
    """
    Base class for conference modification
    """

    def _checkParams( self ):

        try:
            self._target = self._conf = ConferenceHolder().getById(self._params["conference"]);
        except:
            try:
                self._target = self._conf = ConferenceHolder().getById(self._params["confId"]);
            except:
                raise ServiceError("ERR-E4", "Invalid conference id.")
            if self._target == None:
                Logger.get('rpc.conference').debug('self._target is null')
                raise Exception("Null target.")


    def _getCheckFlag(self):
        """
        Returns the "check" flag, a value that specifies what kind of
        checking should be done before modifying. Classes that wish
        to change this behavior should overload it.
        """

        # automatically adapt everything
        return 2


class ConferenceModifBase(ProtectedModificationService, ConferenceBase):
    def _checkParams(self):
        ConferenceBase._checkParams(self)
        ProtectedModificationService._checkParams(self)

class ConferenceScheduleModifBase(ConferenceModifBase):
    def _checkParams(self):
        ConferenceModifBase._checkParams(self)

        self._schEntry = self._conf.getSchedule().getEntryById(self._params["scheduleEntry"])
        if self._schEntry == None:
            raise ServiceError("ERR-E4", "Invalid scheduleEntry id.")

    def _checkProtection( self ):
        self._target = self._schEntry.getOwner()
        ConferenceModifBase._checkProtection(self)

class ConferenceDisplayBase(ProtectedDisplayService, ConferenceBase):

    def _checkParams(self):
        ConferenceBase._checkParams(self)
        ProtectedDisplayService._checkParams(self)

class ConferenceTextModificationBase(TextModificationBase, ConferenceModifBase):
    #Note: don't change the order of the inheritance here!
    pass

class ConferenceHTMLModificationBase(HTMLModificationBase, ConferenceModifBase):
    #Note: don't change the order of the inheritance here!
    pass

class ConferenceDateTimeModificationBase (DateTimeModificationBase, ConferenceModifBase):
    #Note: don't change the order of the inheritance here!
    pass

class ConferenceListModificationBase (ListModificationBase, ConferenceModifBase):
    #Note: don't change the order of the inheritance here!
    pass


class ConferenceTitleModification( ConferenceTextModificationBase ):
    """
    Conference title modification
    """
    def _handleSet(self):
        title = self._value
        if (title ==""):
            raise ServiceError("ERR-E2",
                               "The title cannot be empty")
        self._target.setTitle(self._value)

    def _handleGet(self):
        return self._target.getTitle()


class ConferenceDescriptionModification( ConferenceHTMLModificationBase ):
    """
    Conference description modification
    """
    def _handleSet(self):
        self._target.setDescription(self._value)

    def _handleGet(self):
        return self._target.getDescription()

class ConferenceAdditionalInfoModification( ConferenceHTMLModificationBase ):
    """
    Conference additional info (a.k.a contact info) modification
    """
    def _handleSet(self):
        self._target.setContactInfo(self._value)

    def _handleGet(self):
        return self._target.getContactInfo()

class ConferenceTypeModification( ConferenceTextModificationBase ):
    """
    Conference title modification
    """
    def _handleSet(self):
        curType = self._target.getType()
        newType = self._value
        if newType != "" and newType != curType:
            import MaKaC.webinterface.webFactoryRegistry as webFactoryRegistry
            wr = webFactoryRegistry.WebFactoryRegistry()
            factory = wr.getFactoryById(newType)
            wr.registerFactory(self._target, factory)

            styleMgr = info.HelperMaKaCInfo.getMaKaCInfoInstance().getStyleManager()

            dispMgr = displayMgr.ConfDisplayMgrRegistery().getDisplayMgr(self._target)
            dispMgr.setDefaultStyle(styleMgr.getDefaultStyleForEventType(newType))

    def _handleGet(self):
        return self._target.getType()


class ConferenceBookingModification( ConferenceTextModificationBase ):
    """
    Conference location name modification
    """
    def _handleSet(self):
        changed = False
        room = self._target.getRoom()
        loc = self._target.getLocation()

        newLocation = self._value.get('location')
        newRoom = self._value.get('room')

        if room == None:
            room = conference.CustomRoom()
            self._target.setRoom(room)

        if room.getName() != newRoom:
            room.setName(newRoom)
            changed = True

        if loc == None:
            loc = conference.CustomLocation()
            self._target.setLocation(loc)

        if loc.getName() != newLocation:
            loc.setName(newLocation)
            changed = True

        loc.setAddress(self._value['address'])

        if changed:
            self._target._notify('placeChanged')

    def _handleGet(self):

        loc = self._target.getLocation()
        room = self._target.getRoom()
        if loc:
            locName = loc.getName()
            locAddress = loc.getAddress()
        else:
            locName = ''
            locAddress = ''
        if room:
            roomName = room.name
        else:
            roomName = ''

        return { 'location': locName,
                 'room': roomName,
                 'address': locAddress }

class ConferenceBookingDisplay( ConferenceDisplayBase ):
    """
        Conference location
    """
    def _getAnswer(self):
        loc = self._target.getLocation()
        room = self._target.getRoom()
        if loc:
            locName = loc.getName()
            locAddress = loc.getAddress()
        else:
            locName = ''
            locAddress = ''
        if room:
            roomName = room.name
        else:
            roomName = ''

        return { 'location': locName,
                 'room': roomName,
                 'address': locAddress }

class ConferenceSpeakerTextModification( ConferenceTextModificationBase ):
    """ Conference chairman text modification (for conferences and meetings)
    """
    def _handleSet(self):
        self._target.setChairmanText(self._value)

    def _handleGet(self):
        return self._target.getChairmanText()

class ConferenceOrganiserTextModification( ConferenceTextModificationBase ):
    """ Conference organiser text modification (for lectures)
    """
    def _handleSet(self):
        self._target.setOrgText(self._value)

    def _handleGet(self):
        return self._target.getOrgText()

class ConferenceSupportEmailModification( ConferenceTextModificationBase ):
    """
    Conference support e-mail modification
    """
    def _handleSet(self):
        # handling the case of a list of emails with separators different than ","
        emailstr = setValidEmailSeparators(self._value)

        if validMail(emailstr) or emailstr == '':
            self._target.setSupportEmail(emailstr)
        else:
            raise ServiceError('ERR-E0', 'E-mail address %s is not valid!' %
                               self._value)

    def _handleGet(self):
        return self._target.getSupportEmail()

class ConferenceSupportModification( ConferenceTextModificationBase ):
    """
    Conference support caption and e-mail modification
    """
    def _handleSet(self):
        dMgr = displayMgr.ConfDisplayMgrRegistery().getDisplayMgr(self._target)
        caption = self._value.get("caption","")
        email = self._value.get("email")

        if caption == "":
            raise ServiceError("ERR-E2", "The caption cannot be empty")
        dMgr.setSupportEmailCaption(caption)

        # handling the case of a list of emails with separators different than ","
        email = setValidEmailSeparators(email)

        if validMail(email) or email == "":
            self._target.setSupportEmail(email)
        else:
            raise ServiceError('ERR-E0', 'E-mail address %s is not valid!' %
                               self._value)

    def _handleGet(self):
        dMgr = displayMgr.ConfDisplayMgrRegistery().getDisplayMgr(self._target)
        caption = dMgr.getSupportEmailCaption()
        email = self._target.getSupportEmail()

        return { "caption": caption,
                 "email": email }

class ConferenceDefaultStyleModification( ConferenceTextModificationBase ):
    """
    Conference default style modification
    """
    def _handleSet(self):
        dispManReg = displayMgr.ConfDisplayMgrRegistery()
        dispManReg.getDisplayMgr(self._target).setDefaultStyle(self._value)

    def _handleGet(self):
        dispManReg = displayMgr.ConfDisplayMgrRegistery()
        return dispManReg.getDisplayMgr(self._target).getDefaultStyle()

class ConferenceVisibilityModification( ConferenceTextModificationBase ):
    """
    Conference visibility modification
    """

    def _handleSet(self):
        try:
            val = int(self._value)
        except ValueError:
            raise ServiceError("ERR-E1","Invalid value type for property")
        self._target.setVisibility(val)

    def _handleGet(self):
        return self._target.getVisibility()

class ConferenceStartEndDateTimeModification( ConferenceModifBase ):
    """
    Conference start date/time modification

    When changing the start date / time, the _setParam method will be called
    by DateTimeModificationBase's _handleSet method.
    The _setParam method will return None (if there are no problems),
    or a Warning object if the event start date change was OK but there were
    side problems, such as an object observing the event start date change
    could not perform its task
    (Ex: a videoconference booking could not be moved in time according with
    the conference's time change)
    For this, it will check the 'dateChangeNotificationProblems' context variable.
    """

    def _checkParams(self):

        ConferenceModifBase._checkParams(self)

        pm = ParameterManager(self._params.get('value'), timezone=self._conf.getTimezone())

        self._startDate = pm.extract('startDate', pType=datetime.datetime)
        self._endDate = pm.extract('endDate', pType=datetime.datetime)
        self._shiftTimes = pm.extract('shiftTimes', pType=bool)

    def _getAnswer(self):

        ContextManager.set('dateChangeNotificationProblems', {})

        if (self._shiftTimes):
            moveEntries = 1
        else:
            moveEntries = 0

        # first sanity check
        if (self._startDate > self._endDate):
            raise ServiceError("ERR-E3",
                               "Date/time of start cannot "
                               "be greater than date/time of end")

        # catch TimingErrors that can be returned by the algorithm
        try:
            self._target.setDates(self._startDate,
                                  self._endDate,
                                  moveEntries = moveEntries)
        except TimingError,e:
            raise TimingNoReportError(e.getMsg(),
                                      title = _("Cannot set event dates"),
                                      explanation = e.getExplanation())

        dateChangeNotificationProblems = ContextManager.get('dateChangeNotificationProblems')

        if dateChangeNotificationProblems:

            warningContent = []
            for problemGroup in dateChangeNotificationProblems.itervalues():
                warningContent.extend(problemGroup)

            w = Warning(_('Warning'), [_('The start date of your event was changed correctly. '
                                       'However, there were the following problems:'),
                                       warningContent])

            return ResultWithWarning(self._params.get('value'), w).fossilize()

        else:
            return self._params.get('value')

class ConferenceListUsedRooms( ConferenceDisplayBase ):
    """
    Get rooms that are used in the context of the conference:
     * Booked in CRBS
     * Already chosen in sessions
    """
    def _getAnswer( self ):
        """
        Calls _handle() on the derived classes, in order to make it happen. Provides
        them with self._value.
        """
        roomList = []
        roomList.extend(self._target.getRoomList())
        roomList.extend(map(lambda x: x._getName(), self._target.getBookedRooms()))

        return roomList


class ConferenceDateTimeEndModification( ConferenceDateTimeModificationBase ):
    """ Conference end date/time modification
        When changing the end date / time, the _setParam method will be called by DateTimeModificationBase's _handleSet method.
        The _setParam method will return None (if there are no problems),
        or a FieldModificationWarning object if the event start date change was OK but there were side problems,
        such as an object observing the event start date change could not perform its task
        (Ex: a videoconference booking could not be moved in time according with the conference's time change)
    """
    def _setParam(self):

        ContextManager.set('dateChangeNotificationProblems', {})

        if (self._pTime < self._target.getStartDate()):
            raise ServiceError("ERR-E3",
                               "Date/time of end cannot "+
                               "be lower than data/time of start")
        self._target.setDates(self._target.getStartDate(),
                              self._pTime.astimezone(timezone("UTC")),
                              moveEntries=0)

        dateChangeNotificationProblems = ContextManager.get('dateChangeNotificationProblems')

        if dateChangeNotificationProblems:
            warningContent = []
            for problemGroup in dateChangeNotificationProblems.itervalues():
                warningContent.extend(problemGroup)

            return Warning(_('Warning'), [_('The end date of your event was changed correctly.'),
                                          _('However, there were the following problems:'),
                                          warningContent])
        else:
            return None


    def _handleGet(self):
        return datetime.datetime.strftime(self._target.getAdjustedEndDate(),
                                          '%d/%m/%Y %H:%M')


class ConferenceListContributions (ConferenceListModificationBase):
    """ Returns a list of all contributions of a conference, ordered by id
    """

    def _checkParams(self):
        ConferenceListModificationBase._checkParams(self)
        pm = ParameterManager(self._params)
        self._selTypes = pm.extract("selTypes", pType=list, allowEmpty = True) #ids of selected types
        self._selTracks = pm.extract("selTracks", pType=list, allowEmpty = True) #ids of selected tracks
        self._selSessions = pm.extract("selSessions", pType=list, allowEmpty = True) #ids of selected sessions

        self._typeShowNoValue = self._params.get("typeShowNoValue", True)
        self._trackShowNoValue = self._params.get("trackShowNoValue", True)
        self._sessionShowNoValue = self._params.get("sessionShowNoValue", True)

        self._showWithReferee = self._params.get("showWithReferee", False)
        self._showWithEditor = self._params.get("showWithEditor", False)
        self._showWithReviewer = self._params.get("showWithReviewer", False)

        self._poster = self._params.get("poster", False)
        self._posterShowNoValue = self._params.get("posterShowNoValue", True)

    def _checkProtection(self):
        if not RCPaperReviewManager.hasRights(self) and not RCReferee.hasRights(self):
            ProtectedModificationService._checkProtection(self)

    def _handleGet(self):
        contributions = self._conf.getContributionList()

        filter = {}

        #filtering if the active user is a referee: he can only see his own contribs
        isOnlyReferee = RCReferee.hasRights(self) \
                        and not RCPaperReviewManager.hasRights(self) \
                        and not self._conf.canModify(self.getAW())
        if isOnlyReferee:
            filter["referee"] = self._getUser()
        elif self._showWithReferee:
            filter["referee"] = "any"
        else:
            filter["referee"] = None

        if self._showWithEditor:
            filter["editor"] = "any"
        else:
            filter["editor"] = None
        if self._showWithReviewer:
            filter["reviewer"] = "any"
        else:
            filter["reviewer"] = None


        #note by David: I added "if self._selTypes..." and the other ifs after this line,
        #in order to make the recording request load contributions work
        #but, it may break the paper reviewing module -> assign contributions filter
        if self._selTypes:
            filter["type"] = self._selTypes
        if self._selTracks:
            filter["track"] = self._selTracks
        if self._selSessions:
            filter["session"] = self._selSessions
        if self._poster:
            filter["poster"] = self._poster

        filterCrit = ContributionsReviewingFilterCrit(self._conf, filter)
        sortingCrit = contribFilters.SortingCriteria(["number"])

        if self._selTypes:
            filterCrit.getField("type").setShowNoValue( self._typeShowNoValue )
        if self._selTracks:
            filterCrit.getField("track").setShowNoValue( self._trackShowNoValue )
        if self._selSessions:
            filterCrit.getField("session").setShowNoValue( self._sessionShowNoValue )
        if self._poster:
            filterCrit.getField("poster").setShowNoValue( self._posterShowNoValue )

        filterCrit.getField("referee").setShowNoValue( not isOnlyReferee )

        f= filters.SimpleFilter(filterCrit, sortingCrit)
        contributions = f.apply(contributions)

        return fossilize(contributions, IContributionFossil)

class ConferenceDeleteContributions (ConferenceModifBase):
    """ Deletes a list of all contributions of a conference
    """

    def _checkParams(self):
        ConferenceModifBase._checkParams(self)
        self._selectedContributions = self._params.get('contributions',[])

    def _getAnswer(self):
        for contribId in self._selectedContributions:
            contrib = self._conf.getContributionById(contribId)
            contrib.getParent().getSchedule().removeEntry(contrib.getSchEntry())
            self._conf.removeContribution(contrib)

#########################
# Contribution filtering
#########################

class ContributionsReviewingFilterCrit(filters.FilterCriteria):
    _availableFields = {
        contribFilters.RefereeFilterField.getId() : contribFilters.RefereeFilterField,
        contribFilters.EditorFilterField.getId() : contribFilters.EditorFilterField,
        contribFilters.ReviewerFilterField.getId() : contribFilters.ReviewerFilterField,
        contribFilters.TypeFilterField.getId() : contribFilters.TypeFilterField,
        contribFilters.TrackFilterField.getId() : contribFilters.TrackFilterField,
        contribFilters.SessionFilterField.getId() : contribFilters.SessionFilterField,
        contribFilters.PosterFilterField.getId() : contribFilters.PosterFilterField
    }

#############################
# Conference Modif Display  #
#############################

class ConferencePicDelete(ConferenceModifBase):

    def _checkParams(self):
        ConferenceModifBase._checkParams(self)

        pm = ParameterManager(self._params)

        self._id = pm.extract("picId", pType=str, allowEmpty=False)

    def _getAnswer(self):
        im = displayMgr.ConfDisplayMgrRegistery().getDisplayMgr(self._conf).getImagesManager()
        im.removePic(self._id)

#############################
# Conference cretion        #
#############################

class ShowConcurrentEvents(ServiceBase):

    def _checkParams(self):
        ServiceBase._checkParams(self)

        pm = ParameterManager(self._params)

        self._tz = pm.extract("timezone", pType=str, allowEmpty=False)
        pm.setTimezone(self._tz)
        self._sDate = pm.extract("sDate", pType=datetime.datetime, allowEmpty=False)
        self._eDate = pm.extract("eDate", pType=datetime.datetime, allowEmpty=False)

    def _getAnswer( self ):
        im = indexes.IndexesHolder()
        ch = ConferenceHolder()
        calIdx = im.getIndex("calendar")
        evtIds = calIdx.getObjectsIn(self._sDate, self._eDate)

        evtsByCateg={}
        for evtId in evtIds:
            try:
                evt = ch.getById(evtId)
                categs =evt.getOwnerList()
                categname =categs[0].getName()
                if not evtsByCateg.has_key(categname):
                    evtsByCateg[categname] = []
                evtsByCateg[categname].append((evt.getTitle().strip(),evt.getAdjustedStartDate().strftime('%d/%m/%Y %H:%M '),evt.getAdjustedEndDate().strftime('%d/%m/%Y %H:%M '), evt.getTimezone()))

            except Exception:
                continue
        return evtsByCateg


class ConferenceGetFieldsAndContribTypes(ConferenceDisplayBase):
    def _getAnswer( self ):
        afm = self._target.getAbstractMgr().getAbstractFieldsMgr()
        afmDict =  dict([(f.getId(), f.getName()) for f in afm.getFields()])
        cTypes = self._target.getContribTypeList()
        cTypesDict =  dict([(ct.getId(), ct.getName()) for ct in cTypes])
        return [afmDict, cTypesDict]


class ConferenceParticipationForm(ConferenceDisplayBase):
    def _getAnswer(self):

        params = {}

        if self._conf.getStartDate() < timezoneUtils.nowutc() :
            return """This event began on %s, you cannot apply for
                      participation after the event began."""%self._conf.getStartDate()

        if not self._conf.getParticipation().isAllowedForApplying() :
            return """Participation in this event is restricted to persons invited.
                      If you insist on taking part in this event, please contact the event manager."""

        p = wcomponents.WNewPerson()

        params["formAction"] = str(urlHandlers.UHConfParticipantsAddPending.getURL(self._conf))
        params["formTitle"] = None
        params["cancelButtonParams"] = """ type="button" id="cancelRegistrationButton" """

        params["titleValue"] = ""
        params["surNameValue"] = ""
        params["nameValue"] = ""
        params["emailValue"] = ""
        params["addressValue"] = ""
        params["affiliationValue"] = ""
        params["phoneValue"] = ""
        params["faxValue"] = ""

        user = self._getUser()
        if user is not None :
            params["titleValue"] = user.getTitle()
            params["surNameValue"] = user.getFamilyName()
            params["nameValue"] = user.getName()
            params["emailValue"] = user.getEmail()
            params["addressValue"] = user.getAddress()
            params["affiliationValue"] = user.getAffiliation()
            params["phoneValue"] = user.getTelephone()
            params["faxValue"] = user.getFax()

            params["disabledTitle"] = params["disabledSurName"] = True
            params["disabledName"] = params["disabledEmail"] = True
            params["disabledAddress"] = params["disabledPhone"] = True
            params["disabledFax"] = params["disabledAffiliation"] = True

        return p.getHTML(params)

class ConferenceProtectionUserList(ConferenceModifBase):

    def _getAnswer(self):
        #will use IAvatarFossil or IGroupFossil
        return fossilize(self._conf.getAllowedToAccessList())

class ConferenceProtectionAddUsers(ConferenceModifBase):

    def _checkParams(self):
        ConferenceModifBase._checkParams(self)

        self._usersData = self._params['value']
        self._user = self.getAW().getUser()

    def _getAnswer(self):

        for user in self._usersData :

            userToAdd = PrincipalHolder().getById(user['id'])

            if not userToAdd :
                raise ServiceError("ERR-U0","User does not exist!")

            self._conf.grantAccess(userToAdd)

class ConferenceProtectionRemoveUser(ConferenceModifBase):

    def _checkParams(self):
        ConferenceModifBase._checkParams(self)

        self._userData = self._params['value']

        self._user = self.getAW().getUser()

    def _getAnswer(self):

        userToRemove = PrincipalHolder().getById(self._userData['id'])

        if not userToRemove :
            raise ServiceError("ERR-U0","User does not exist!")
        elif isinstance(userToRemove, Avatar) or isinstance(userToRemove, Group) :
            self._conf.revokeAccess(userToRemove)

class ConferenceProtectionSetAccessKey(ConferenceModifBase):

    def _checkParams(self):
        ConferenceModifBase._checkParams(self)
        self._accessKey = self._params.get("accessKey", "")

    def _getAnswer(self):
        self._conf.setAccessKey(self._accessKey)

class ConferenceProtectionSetModifKey(ConferenceModifBase):

    def _checkParams(self):
        ConferenceModifBase._checkParams(self)
        self._modifKey = self._params.get("modifKey", "")

    def _getAnswer(self):
        self._conf.setModifKey(self._modifKey)

class ConferenceContactInfoModification( ConferenceTextModificationBase ):
    """
    Conference contact email modification
    """
    def _handleSet(self):
        self._target.getAccessController().setContactInfo(self._value)
    def _handleGet(self):
        return self._target.getAccessController().getContactInfo()

class ConferenceAlarmSendTestNow(ConferenceModifBase):

    def _checkParams(self):
        ConferenceModifBase._checkParams(self)
        pm = ParameterManager(self._params)
        self._fromAddr = pm.extract("fromAddr", pType=str, allowEmpty=True, defaultValue="")
        self._note = pm.extract("note", pType=str, allowEmpty=True)
        self._includeConf = pm.extract("includeConf", pType=str, allowEmpty=True, defaultValue="")

    def _getAnswer(self):
        al = tasks.AlarmTask(self._conf, 0, datetime.timedelta(), relative=datetime.timedelta())
        if self._fromAddr:
            al.setFromAddr(self._fromAddr)
        else:
            raise NoReportError(_("""Please choose a "FROM" address for the test alarm"""))
        al.setNote(self._note)
        al.setConfSummary(self._includeConf == "1")
        if self._getUser():
            al.addToAddr(self._aw.getUser().getEmail())
        else:
            raise NoReportError(_("You must be logged in to use this feature"))
        al.run(check = False)
        return True

methodMap = {
    "main.changeTitle": ConferenceTitleModification,
    "main.changeSupportEmail": ConferenceSupportEmailModification,
    "main.changeSupport": ConferenceSupportModification,
    "main.changeSpeakerText": ConferenceSpeakerTextModification,
    "main.changeOrganiserText": ConferenceOrganiserTextModification,
    "main.changeDefaultStyle": ConferenceDefaultStyleModification,
    "main.changeVisibility": ConferenceVisibilityModification,
    "main.changeType": ConferenceTypeModification,
    "main.changeDescription": ConferenceDescriptionModification,
    "main.changeAdditionalInfo": ConferenceAdditionalInfoModification,
    "main.changeDates": ConferenceStartEndDateTimeModification,
    "main.changeBooking": ConferenceBookingModification,
    "main.displayBooking": ConferenceBookingModification,
    "rooms.list" : ConferenceListUsedRooms,
    "contributions.list" : ConferenceListContributions,
    "contributions.delete": ConferenceDeleteContributions,
    "pic.delete": ConferencePicDelete,
    "showConcurrentEvents": ShowConcurrentEvents,
#    "getFields": ConferenceGetFields,
    "getFieldsAndContribTypes": ConferenceGetFieldsAndContribTypes,
    "getParticipationForm": ConferenceParticipationForm,
    "protection.getAllowedUsersList": ConferenceProtectionUserList,
    "protection.addAllowedUsers": ConferenceProtectionAddUsers,
    "protection.removeAllowedUser": ConferenceProtectionRemoveUser,
    "protection.setAccessKey": ConferenceProtectionSetAccessKey,
    "protection.setModifKey": ConferenceProtectionSetModifKey,
    "protection.changeContactInfo": ConferenceContactInfoModification,
    "alarm.sendTestNow": ConferenceAlarmSendTestNow
    }
