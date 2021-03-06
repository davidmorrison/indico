/**
    @namespace Pop-up dialogs
*/


extend(IndicoUI.Dialogs,
       {
           addSession: function(method, timeStartMethod, args, roomInfo, parentRoomInfo, dayStartDate, favoriteRooms, days, successFunc, bookedRooms, timetable){

               var parameterManager = new IndicoUtil.parameterManager();

               var info = new WatchObject();
               var dateArgs = clone(args);
               //for the first day in the list, select a time just after the last session/contribution/break
               dateArgs.selectedDay = dayStartDate;

               var killLoadProgress = IndicoUI.Dialogs.Util.progress($T("Loading dialog..."));

               IndicoUtil.waitLoad([
                   function(hook) {
                       // Get "end date" for container, so that the break be added after the rest
                       indicoRequest(timeStartMethod, dateArgs , function(result, error){
                           if (error) {
                               killLoadProgress();
                               IndicoUtil.errorReport(error);
                           }
                           else {
                               var startDate = Util.parseJSDateTime(result, IndicoDateTimeFormats.Server);
                               var endDate = Util.parseJSDateTime(result, IndicoDateTimeFormats.Server);

                               /*
                                * If suggested start time is later the 23h then set the suggested
                                * time to latest possible: 23:00 - 23:59.
                                */
                               if (startDate.getHours() >= 23) {
                                   startDate.setHours(23);
                                   startDate.setMinutes(0);
                                   endDate.setHours(23);
                                   endDate.setMinutes(59);
                               } else {
                                   // end date is one hour later, by default
                                   endDate.setHours(startDate.getHours()+1);
                               }
                               info.set('startDateTime', Util.formatDateTime(startDate, IndicoDateTimeFormats.Server));
                               info.set('endDateTime', Util.formatDateTime(endDate, IndicoDateTimeFormats.Server));
                               dateArgs.startDate = startDate;
                               dateArgs.endDate = endDate;
                               hook.set(true);
                           }
                       });
                   }], function(retValue) {

                       killLoadProgress();

                       var submitInfo = function() {
                           each(args, function(value, key) {
                               info.set(key, value);
                           });
                           if (parameterManager.check()) {
                               var killProgress = IndicoUI.Dialogs.Util.progress();
                               indicoRequest(method, info,
                                             function(result, error){
                                                 killProgress();
                                                 if (error) {
                                                     IndicoUtil.errorReport(error);
                                                 } else {
                                                     popup.close();
                                                     successFunc(result);
                                                 }
                                             });
                           }
                       };

                       var popup = new ExclusivePopupWithButtons($T('Add Session'));

                       var roomEditor;

                       popup.postDraw = function() {
                           roomEditor.postDraw();
                           this.ExclusivePopup.prototype.postDraw.call(this);
                           $E('sessionTitle').dom.focus();
                       };

                       popup.draw = function(){
                           var self = this;
                           var addButton = Html.input('button', {},$T("Add"));
                           var cancelButton = Html.input('button', {},$T("Cancel"));
                           cancelButton.dom.style.marginLeft = pixels(10);

                           info.set('roomInfo', $O(roomInfo));


                           roomEditor = new RoomBookingReservationWidget(Indico.Data.Locations, info.get('roomInfo'), parentRoomInfo, true, favoriteRooms, null, bookedRooms, timetable.parentTimetable?timetable.parentTimetable.getData():timetable.getData(), info);

                           cancelButton.observeClick(function(){
                               self.close();
                           });


                           addButton.observeClick(function(){
                               submitInfo();
                           });

                           var convListWidget = new UserListField(
                               'VeryShortPeopleListDiv', 'PeopleList',
                               null, true, null,
                               true, false, null, null,
                               true, true, true,
                               userListNothing, userListNothing, userListNothing);

                           $B(info.accessor('conveners'), convListWidget.getUsers());

                           var sesType = new RadioFieldWidget([['standard', $T('Standard')],['poster',$T('Poster')]],'nobulletsListInline');
                           $B(info.accessor('sessionType'), sesType);

                           sesType.select('standard');

                           //Create the list of the days in which the conference is being held
                           var conferenceDays = bind.element(
                                   Html.select({name: 'type'}),
                                   days,
                                   function(elem) {
                                       var d = Util.formatDateTime(elem, IndicoDateTimeFormats.DefaultHourless, IndicoDateTimeFormats.Ordinal);
                                       return Html.option({value: elem}, d);
                                   }
                               );
                           conferenceDays.set(Util.formatDateTime(dayStartDate, IndicoDateTimeFormats.Ordinal, IndicoDateTimeFormats.ServerHourless));

                           //We need to update the value of startDateTime and endDateTime every time that is changed by the user
                           //value is the new date
                           conferenceDays.observe(function(value) {
                               //it is neccesary to update the date in dateArgs with the new date to make the request
                               dateArgs.selectedDay = Util.formatDateTime(value, IndicoDateTimeFormats.ServerHourless, IndicoDateTimeFormats.Ordinal);
                               //we make a timeStartMethod request specifying the date for the request
                               //and we get the result of the request in result
                               indicoRequest(timeStartMethod, dateArgs , function(result, error){
                                   if (error) {
                                       IndicoUtil.errorReport(error);
                                   }
                                   else {
                                       //update startDate and endDate and assign it to the variables in info
                                       var startDate = Util.parseJSDateTime(result, IndicoDateTimeFormats.Server);
                                       var endDate = Util.parseJSDateTime(result, IndicoDateTimeFormats.Server);

                                       var diffHours = dateArgs.endDate.getHours() - dateArgs.startDate.getHours();
                                       var diffMinutes = Math.abs(dateArgs.endDate.getMinutes() - dateArgs.startDate.getMinutes());
                                       if (startDate.getHours() >= 23) {
                                           startDate.setHours(23);
                                           startDate.setMinutes(0);
                                           endDate.setHours(23);
                                           endDate.setMinutes(59);
                                       } else {
                                           endDate.setHours(startDate.getHours()+diffHours);
                                           endDate.setMinutes(startDate.getMinutes()+diffMinutes);
                                       }
                                       info.set('startDateTime', Util.formatDateTime(startDate, IndicoDateTimeFormats.Server));
                                       info.set('endDateTime', Util.formatDateTime(endDate, IndicoDateTimeFormats.Server));
                                   }
                               });

                               /*
                                * parameterManager is not called because if you just change the date and it's not correct you just need
                                * to have red fields in the date, so what we're doing is just adding a dispatchEvent for both hour fields
                                * (they are Html.input, so they can be added to the dispatchEvent) to know when they have changed
                                */
                               startEndTimeField.startTimeField.dispatchEvent('change');
                               startEndTimeField.endTimeField.dispatchEvent('change');
                           });

                           var startEndTimeField = IndicoUI.Widgets.Generic.dateStartEndTimeField(info.get('startDateTime').substr(11,5), info.get('endDateTime').substr(11,5));
                           var startEndTimeComponent;
                           //template for the binding
                           var timeTranslation = {
                                   toTarget: function (value) {
                                       var aux = conferenceDays.get();
                                       return Util.formatDateTime(aux, IndicoDateTimeFormats.ServerHourless, IndicoDateTimeFormats.Ordinal) + ' ' + value;
                                   },
                                   toSource: function(value) {
                                       return value.substr(11,5);
                                   }
                           };

                           $B(info.accessor('startDateTime'), startEndTimeField.accessor.accessor('startTime'), timeTranslation);
                           $B(info.accessor('endDateTime'), startEndTimeField.accessor.accessor('endTime'), timeTranslation);

                           parameterManager.add(startEndTimeField.startTimeField, 'time', false);
                           parameterManager.add(startEndTimeField.endTimeField, 'time', false);
                           startEndTimeComponent = [$T('Time'), startEndTimeField.element];

                           // Create the color picker
                           var colorPicker = new ColorPicker([], false);
                           info.set('textColor', colorPicker.getTextColor());
                           info.set('bgColor', colorPicker.getBgColor());
                           colorPicker.observe(function(colors) {
                               info.set('textColor', colors.textColor);
                               info.set('bgColor', colors.bgColor);
                           });
                           colorPicker.setFixedPosition();
                           var colorPickerComponent = ['Color', Html.div({style: {padding: '5px 0 10px 0'}}, colorPicker.getLink(null, 'Choose a color'))];
                           var contentDiv = Html.div({},
                               IndicoUtil.createFormFromMap([
                                   [$T('Title'), $B(parameterManager.add(Html.edit({ id: 'sessionTitle'}), 'text', false), info.accessor('title'))],
                                   [$T('Description'), $B(Html.textarea({cols: 40, rows: 2}), info.accessor('description'))],
                                   [$T('Date'), conferenceDays],
                                   startEndTimeComponent,
                                   [$T('Place'), Html.div({style: {marginBottom: '15px'}}, roomEditor.draw())],
                                   colorPickerComponent,
                                   [$T('Convener(s)'), convListWidget.draw()],
                                   [$T('Session type'), sesType.draw()]]));

                           var buttonDiv = Html.div({}, addButton, cancelButton);

                           return this.ExclusivePopupWithButtons.prototype.draw.call(this, contentDiv, buttonDiv);
                       };
                       popup.open();
                   }).run();
           },

           /**
        * Creates a dialog that allows a session slot to be added
        * to the schedule (inside a particular session)
        * @param {String} method The name of the JSON-RPC method
        *        that will be called for the slot to be added
        * @param {String} timeStartMethod The JSON-RPC method that
        *        will be called in order to know what the default date/time for
        *        the start of the slot will be
        * @param {Object} args the arguments that will be passed to the
        *        JSON-RPC methods, in order to identify the event the slot
        *        will be added to
        * @param {Object} roomInfo The object that contains the default room information
        *        for the dialog (inherited from the parent, normally)
        * @param {String} confStartDate A string representing the start date/time of the
        *        parent event (DD/MM/YYY HH:MM)
        * @param {String} dayStartDate A string representing the date of the day the
        *        calendar is currently pointing to (DD/MM/YYYY)
        */
           addSessionSlot: function(method, timeStartMethod, params, roomInfo, parentRoomInfo, confStartDate, dayStartDate, favoriteRooms, days, successFunc, editOn, bookedRooms, timetable){
               var parameterManager = new IndicoUtil.parameterManager();
               var isEdit = exists(editOn)?editOn:false;
               var args = isEdit?params:params.args;
               var dateArgs = clone(args);
               dateArgs.selectedDay = dayStartDate;
               var info = new WatchObject();
               var parentRoomData;
               previousDay = dateArgs.selectedDay;

               var killLoadProgress = IndicoUI.Dialogs.Util.progress($T("Loading dialog..."));

               IndicoUtil.waitLoad([
                   isEdit?function(hook){
                       dateArgs.startDate = new Date(dateArgs.startDate.date.substr(0,4),
                               dateArgs.startDate.date.substr(5,2),
                               dateArgs.startDate.date.substr(8,2),
                               dateArgs.startDate.time.substr(0,2),
                               dateArgs.startDate.time.substr(3,2),
                               dateArgs.startDate.time.substr(6,2));
                       dateArgs.endDate = new Date(dateArgs.endDate.date.substr(0,4),
                               dateArgs.endDate.date.substr(5,2),
                               dateArgs.endDate.date.substr(8,2),
                               dateArgs.endDate.time.substr(0,2),
                               dateArgs.endDate.time.substr(3,2),
                               dateArgs.endDate.time.substr(6,2));
                       hook.set(true);}:function(hook) {
                       // Get "end date" for container, so that the break be added after the rest
                       indicoRequest(timeStartMethod, dateArgs , function(result, error){
                           if (error) {
                               killLoadProgress();
                               IndicoUtil.errorReport(error);
                           }
                           else {
                               var startDate = Util.parseJSDateTime(result, IndicoDateTimeFormats.Server);
                               var endDate = Util.parseJSDateTime(result, IndicoDateTimeFormats.Server);
                               /*
                                * If suggested start time is later the 23h then set the suggested
                                * time to latest possible: 23:00 - 23:59.
                                */
                               if (startDate.getHours() >= 23) {
                                   startDate.setHours(23);
                                   startDate.setMinutes(0);
                                   endDate.setHours(23);
                                   endDate.setMinutes(59);
                               } else {
                                   // end date is one hour later, by default
                                   endDate.setHours(startDate.getHours()+1);
                               }

                               dateArgs.startDate = startDate;
                               dateArgs.endDate = endDate;
                               info.set('startDateTime', Util.formatDateTime(startDate, IndicoDateTimeFormats.Server));
                               info.set('endDateTime', Util.formatDateTime(endDate, IndicoDateTimeFormats.Server));
                               hook.set(true);
                           }
                       });

                   }], function(retVal) {

                       killLoadProgress();

                       var submitInfo = function(){
                           each(info, function(value, key) {
                               args[key] = value;
                           });
                           if (parameterManager.check()) {
                               var killProgress = IndicoUI.Dialogs.Util.progress();
                               indicoRequest(method, args, function(result, error){
                                   killProgress();
                                   if (error) {
                                       IndicoUtil.errorReport(error);
                                   }
                                   else {
                                       popup.close();
                                       successFunc(result);
                                   }
                               });
                           }
                       };

                       var popup = new ExclusivePopupWithButtons(
                           isEdit?$T('Edit session block'):$T('Add session block'),
                           function() {
                               popup.close();
                           });

                       var roomEditor;

                       popup.postDraw = function() {
                           roomEditor.postDraw();
                           this.ExclusivePopupWithButtons.prototype.postDraw.call(this);
                       };

                       popup.draw = function() {
                           var self = this;
                           var addButton = Html.input('button', {}, isEdit?$T("Save"):$T("Add"));
                           var cancelButton = Html.input('button', {}, $T("Cancel"));
                           cancelButton.dom.style.marginLeft = pixels(10);

                           /******************************************************
                            * This is the setup for the edition of sessions slots
                            *******************************************************/
                           if (isEdit){
                               info.set('sessionTitle', params.title);
                               info.set('startDateTime', IndicoUtil.formatDateTime(IndicoUtil.parseJsonDate(params.startDate)));
                               info.set('endDateTime', IndicoUtil.formatDateTime(IndicoUtil.parseJsonDate(params.endDate)));
                               info.set('title', params.slotTitle);
                               info.set('scheduleEntry', params.scheduleEntryId);
                               info.set('roomInfo',$O({"location": params.inheritLoc?null:params.location,
                                       "room": params.inheritRoom?null:params.room,
                                       "address": params.inheritLoc?'':params.address}));
                               info.set("conveners", params.conveners);

                           }/******************************************************/
                           else {
                               info.set("conveners", params.sessionConveners);
                               info.set('roomInfo', $O({location: null, room: null}));
                           }

                           if(timetable) {
                               roomEditor = new RoomBookingReservationWidget(Indico.Data.Locations,
                                                              info.get('roomInfo'),
                                                              parentRoomInfo,
                                                              nullRoomInfo(info.get('roomInfo')),
                                                              favoriteRooms,
                                                              null,
                                                              bookedRooms,
                                                              timetable.parentTimetable?timetable.parentTimetable.getData():timetable.getData(),
                                                              info,
                                                              editOn?params.id:null);
                           } else {
                               roomEditor = new RoomBookingWidget(Indico.Data.Locations,
                                       info.get('roomInfo'),
                                       parentRoomInfo,
                                       nullRoomInfo(info.get('roomInfo')),
                                       favoriteRooms,
                                       null);
                           }
                           cancelButton.observeClick(function(){
                               self.close();
                           });

                           addButton.observeClick(function(){
                               submitInfo();
                           });

                           var sessionRename = new SessionRenameWidget(
                                   info.get('sessionTitle'),
                                   parameterManager,
                                   this,
                                   info);

                           var convListWidget = new UserListField(
                               'VeryShortPeopleListDiv', 'PeopleList',
                               isEdit?params.conveners:params.sessionConveners, true, null,
                               true, false, null, null,
                               true, true, true,
                               userListNothing, userListNothing, userListNothing);

                           //Create the list of the days in which the conference is being held
                           var conferenceDays = bind.element(
                                   Html.select({name: 'type'}),
                                   days,
                                   function(elem) {
                                       var d = Util.formatDateTime(elem, IndicoDateTimeFormats.DefaultHourless, IndicoDateTimeFormats.Ordinal);
                                       return Html.option({value: elem}, d);
                                   }
                               );
                           conferenceDays.set(Util.formatDateTime(dayStartDate, IndicoDateTimeFormats.Ordinal, IndicoDateTimeFormats.ServerHourless));

                           //We need to update the value of startDateTime and endDateTime every time that is changed by the user
                           //value is the new date
                           conferenceDays.observe(function(value) {
                               //it is neccesary to update the date in dateArgs with the new date to make the request
                               dateArgs.selectedDay = Util.formatDateTime(value, IndicoDateTimeFormats.ServerHourless, IndicoDateTimeFormats.Ordinal);
                               //we make a timeStartMethod request specifying the date for the request
                               //and we get the result of the request in result
                               indicoRequest(timeStartMethod, dateArgs , function(result, error){
                                   if (error) {
                                       IndicoUtil.errorReport(error);
                                   }
                                   else {
                                       //update startDate and endDate and assign it to the variables in info
                                       var startDate = Util.parseJSDateTime(result, IndicoDateTimeFormats.Server);
                                       var endDate = Util.parseJSDateTime(result, IndicoDateTimeFormats.Server);

                                       var diffHours = dateArgs.endDate.getHours() - dateArgs.startDate.getHours();
                                       var diffMinutes = Math.abs(dateArgs.endDate.getMinutes() - dateArgs.startDate.getMinutes());
                                       if (startDate.getHours() >= 23) {
                                           startDate.setHours(23);
                                           startDate.setMinutes(0);
                                           endDate.setHours(23);
                                           endDate.setMinutes(59);
                                       } else {
                                           endDate.setHours(startDate.getHours()+diffHours);
                                           endDate.setMinutes(startDate.getMinutes()+diffMinutes);
                                       }
                                       info.set('startDateTime', Util.formatDateTime(startDate, IndicoDateTimeFormats.Server));
                                       info.set('endDateTime', Util.formatDateTime(endDate, IndicoDateTimeFormats.Server));
                                   }
                               });

                               /*
                                * parameterManager is not called because if you just change the date and it's not correct you just need
                                * to have red fields in the date, so what we're doing is just adding a dispatchEvent for both hour fields
                                * (they are Html.input, so they can be added to the dispatchEvent) to know when they have changed
                                */
                               startEndTimeField.startTimeField.dispatchEvent('change');
                               startEndTimeField.endTimeField.dispatchEvent('change');
                           });

                           var timezoneMsg = '';
                           if(params.conference && params.conference.timezone) {
                               timezoneMsg = ' (' + $T('Timezone') + ': ' + params.conference.timezone + ')';
                           }
                           var startEndTimeField = IndicoUI.Widgets.Generic.dateStartEndTimeField(info.get('startDateTime').substr(11,5), info.get('endDateTime').substr(11,5), timezoneMsg);
                           var startEndTimeComponent;
                           var timeTranslation = {
                                   toTarget: function (value) {
                                       var aux = conferenceDays.get();
                                       return Util.formatDateTime(aux, IndicoDateTimeFormats.ServerHourless, IndicoDateTimeFormats.Ordinal) + ' ' + value;
                                   },
                                   toSource: function(value) {
                                       return value.substr(11,5);
                                   }
                           };

                           $B(info.accessor('startDateTime'), startEndTimeField.accessor.accessor('startTime'), timeTranslation);
                           $B(info.accessor('endDateTime'), startEndTimeField.accessor.accessor('endTime'), timeTranslation);

                           parameterManager.add(startEndTimeField.startTimeField, 'time', false);
                           parameterManager.add(startEndTimeField.endTimeField, 'time', false);
                           startEndTimeComponent = [$T('Time'), startEndTimeField.element];
                           sessionRenameComponent = isEdit ? [$T('Session'), $T(Html.div({}, sessionRename.draw()))]:[];

                           $B(info.accessor('conveners'), convListWidget.getUsers());

                           var content = IndicoUtil.createFormFromMap([
                               sessionRenameComponent,
                               isEdit ? [$T('Sub-Title'), $B(Html.edit({style: { width: '300px'}}), info.accessor('title'))]:[],
                               [$T('Date'), conferenceDays],
                               startEndTimeComponent,
                               [$T('Place'), Html.div({style: {marginBottom: '15px'}}, roomEditor.draw())],
                               [$T('Convener(s)'), convListWidget.draw()]]);

                           var buttons = Html.div({}, addButton, cancelButton);

                           return this.ExclusivePopupWithButtons.prototype.draw.call(this, content, buttons);
                       };

                       popup.open();

                   }).run();
           },


           /**
        * Creates a dialog that allows a subcontribution to be added
        * to the schedule (inside a contribution)
        * @param {String} contribId The id of the parent contribution
        * @param {String} conferenceId The id of the parent event
        */
           addSubContribution: function (contribId, conferenceId) {

               var args = {conference: conferenceId};

               IndicoUtil.waitLoad([
                   function(hook) {
                       var self = this;
                       var source = indicoSource('user.favorites.listUsers', {});
                       source.state.observe(function(state) {
                           if (state == SourceState.Loaded) {
                               favorites = $L(source);
                               hook.set(true);
                           }
                       });
                   }
               ], function(retVal) {

                   var parameterManager = new IndicoUtil.parameterManager();

                   var info = new WatchObject();

                   var submitInfo = function() {
                       info.set('conference', conferenceId);
                       info.set('contribution', contribId);

                       if (parameterManager.check()) {

                           var killProgress = IndicoUI.Dialogs.Util.progress();
                           indicoRequest("contribution.addSubContribution", info,
                                         function(result, error){
                                             if (error) {
                                                 killProgress();
                                                 IndicoUtil.errorReport(error);
                                             } else {
                                                 window.location.reload(true);
                                             }
                                         });
                           popup.close();
                       }
                   };

                   var popup = new ExclusivePopup(
                       $T('Add Subcontribution'),
                       function() {
                           popup.close();
                       });
                   popup.draw = function() {

                       var self = this;

                       var addButton = Html.input('button', {},$T("Add"));
                       var cancelButton = Html.input('button', {},$T("Cancel"));
                       cancelButton.dom.style.marginLeft = pixels(10);

                       cancelButton.observeClick(function(){
                           self.close();
                       });


                       addButton.observeClick(function(){
                           submitInfo();
                   });


                       var presListWidget = new UserListField(
                               'VeryShortPeopleListDiv', 'PeopleList',
                               null, true, null,
                               true, false, null, null,
                               true, true, true,
                               userListNothing, userListNothing, userListNothing);

                       var keywordField = IndicoUI.Widgets.keywordList('oneLineListItem');

                       $B(info.accessor('presenters'), presListWidget.getUsers());
                       $B(info.accessor('keywords'), keywordField.accessor);

                       return self.ExclusivePopup.prototype.draw.call(
                           this,
                           Widget.block([IndicoUtil.createFormFromMap([
                               [$T('Title'), $B(parameterManager.add(Html.edit({style: {width: '300px'}}), 'text', false), info.accessor('title'))],
                               [$T('Description'), $B(Html.textarea({cols: 40, rows: 2}), info.accessor('description'))],
                               [$T('Keywords'), keywordField.element],
                               [$T('Duration (min) '), $B(parameterManager.add(IndicoUI.Widgets.Generic.durationField(), 'int', false), info.accessor('duration')) ],
                               [$T('Presenter(s)'), presListWidget.draw()]
                           ]),
                                         Html.div({style:{marginTop: pixels(10), textAlign: 'center', background: '#DDDDDD', padding: pixels(2)}},
                                                  [addButton, cancelButton])
                                        ]));
                   };

                   popup.open();

               }).run();
           },

           deleteMinutes: function(confId, sessId, contId, subContId, compile){
               indicoRequest(
                       'minutes.delete',
                       {
                           confId: intToStr(confId),
                           sessionId: intToStr(sessId),
                           contribId: intToStr(contId),
                           subContId: intToStr(subContId),
                           compile: false
                       },
                       function(result,error) {
                           if (!error) {
                               if (result) {
                                   window.location.reload(true);
                               } else {
                                   IndicoUtil.errorReport(error);
                               }
                           }
                       }
                   );

           },

           writeMinutes: function(confId, sessId, contId, subContId, compile) {

               var changedText = new WatchValue(false);
               var wasChanged = false;
               var compileMinutes = exists(compile)?compile:false;
               var killProgress = null;
               var saveAndClose = false;
               var rtWidget = null;
               var useragent = navigator.userAgent;
               useragent = useragent.toLowerCase();

               if (useragent.indexOf('iphone') != -1 || useragent.indexOf('symbianos') != -1 || useragent.indexOf('ipad') != -1 || useragent.indexOf('ipod') != -1 || useragent.indexOf('android') != -1 || useragent.indexOf('blackberry') != -1 || useragent.indexOf('samsung') != -1 || useragent.indexOf('nokia') != -1 || useragent.indexOf('windows ce') != -1 || useragent.indexOf('sonyericsson') != -1 || useragent.indexOf('webos') != -1 || useragent.indexOf('wap') != -1 || useragent.indexOf('motor') != -1 || useragent.indexOf('symbian') != -1 ) {
                   rtWidget = new ParsedRichTextWidget(700, 400,'','plain','IndicoMinimal',true);
               }
               else {
                   rtWidget = new ParsedRichTextEditor(700, 400,'IndicoFull');
               }

               var saveButton;
               var intToStr = function(id) {
                   if (IndicoUtil.isInteger(id)) {
                       return id+'';
                   } else {
                       return null;
                   }
               };

               var popup = new ExclusivePopupWithButtons(
                       $T('My minutes'),
                       function() {
                           popup.closeMinutesPopup();
                       });

               var closeMinutes = function(){
                   popup.close();
                   rtWidget.destroy();

                   if (wasChanged) {
                       window.location.reload(true);
                   }

               };

               var req = indicoSource('minutes.edit',
                   {
                       'confId': intToStr(confId),
                       'sessionId': intToStr(sessId),
                       'contribId': intToStr(contId),
                       'subContId': intToStr(subContId),
                       'compile': compileMinutes
                   });

               req.state.observe(function(state){
                   if (state == SourceState.Error) {
                       if(killProgress) {
                           killProgress();
                       }
                       IndicoUtil.errorReport(req.error.get());
                   } else if (state == SourceState.Loaded) {

                       rtWidget.set(req.get(), !req.get());

                       rtWidget.observe(function(value){
                           changedText.set(true);
                       });

                       if (killProgress) {
                           killProgress();
                           changedText.set(false);
                           wasChanged = true;
                           saveButton.dom.disabled = true;
                           if (saveAndClose) {
                               closeMinutes();
                           }
                       }
                   }
               });

               changedText.observe(
                   function(value) {
                       if (value) {
                           saveButton.dom.disabled = false;
                       }
                   });


               popup.draw = function() {
                   var self = this;
                   var content = Html.div({}, rtWidget.draw());

                   var commitChanges = function() {
                       killProgress = IndicoUI.Dialogs.Util.progress($T('Saving...'));
                       if(rtWidget.clean()){
                           changedText.set(false);
                           wasChanged = true;
                           saveButton.dom.disabled = true;
                           req.set(rtWidget.get());
                       }
                       killProgress();
                   };

                   var commitChangesAndClose = function() {
                       saveAndClose = true;
                       commitChanges();
                   };

                   self.closeMinutesPopup = function(){
                       var confirmation = function(confirmed){
                           if (confirmed == 1){
                               commitChangesAndClose();
                           }
                           else if (confirmed == 2){
                               closeMinutes();
                           }
                       };

                       if (changedText.get()){
                           var popupConfirm = new SaveConfirmPopup( $T("Confirm"), Html.div({}, Html.div({style:{paddingBottom: pixels(16)}},
                                                                    $T("You have modified your text since you last saved.")),
                                                                    Html.div({}, $T("Do you want to save your changes?"))), confirmation);
                           popupConfirm.open();
                       } else {
                           closeMinutes();
                       }
                   };

                   saveButton = Widget.button(command(commitChanges, $T("Save")));
                   saveButton.dom.disabled = !compileMinutes;

                   return this.ExclusivePopupWithButtons.prototype.draw.call(
                       this,
                       content,
                       Html.div({style:{marginTop: pixels(20)}},
                                 saveButton,
                                 Widget.button(command(self.closeMinutesPopup, $T("Close")))));
               };

               popup.open();

           },
           __addSessionSlot: function(slotId, sessionId, confId){
               var slot = undefined;

               indicoRequest("schedule.slot.getFossil",
                             { "slotId" : slotId,
                               "confId" : confId,
                               "sessionId": sessionId},
                               function(slot, error){
                                   if(!error){
                                       slot.sessionId = slot.session.id;
                                       slot.confId = slot.conference.id;
                                       slot.title = slot.session.title;
                                       slot.scheduleEntry = slot.sessionSlotId;
                                       var days = [];
                                       var stDay = Util.parseJSDateTime(slot.conference.startDate.date, '%Y-%m-%d');
                                       var eDay = Util.parseJSDateTime(slot.conference.endDate.date, '%Y-%m-%d');

                                       while(stDay <= eDay){
                                           days.push(IndicoUtil.formatDate2(stDay));
                                           stDay.setDate(stDay.getDate() + 1);
                                       }

                                       IndicoUI.Dialogs.addSessionSlot(
                                               'schedule.session.editSlotById',
                                               'schedule.event.getDayEndDate',
                                               slot,
                                               slot,
                                               $O(slot.session),
                                               slot.startDate,
                                               slot.startDate.date.replace(/-/g,"/"),
                                               [],
                                               days,
                                               function(){
                                                   location.reload(true);
                                               },
                                               true,
                                               [],
                                               null)
                                   }
                               });
           }
       });
