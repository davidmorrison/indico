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
Module containing the persistent classes that will be stored in the DB
"""

# dependency libs
import zope. interface
from persistent import Persistent, mapping

# indico api imports
from indico.core.api import Component
from indico.util.fossilize import IFossil, fossilizes, Fossilizable

# plugin imports
from indico.ext.livesync.struct import SetMultiPointerTrack
from indico.ext.livesync.util import getPluginType
from indico.ext.livesync.base import ILiveSyncAgentProvider


class QueryException(Exception):
    """
    Raised by problems in AgentManager queries
    """


class AgentExecutionException(Exception):
    """
    Raised by problems in Agent execution
    """


class IAgentFossil(IFossil):

    def getId(self):
        pass

    def getName(self):
        pass

    def getDescription(self):
        pass

    def getExtraOptions(self):
        pass
    getExtraOptions.name = 'specific'


class SyncAgent(Fossilizable, Persistent):
    """
    Represents an "agent" (service)
    """

    fossilizes(IAgentFossil)

    _extraOptions = {}

    # TODO: Subclass into PushSyncAgent(task)/PullSyncAgent?

    def __init__(self, aid, name, description, updateTime):
        self._id = aid
        self._name = name
        self._description = description
        self._updateTime = updateTime
        self._manager = None

    def setManager(self, manager):
        self._manager = manager

    def getId(self):
        return self._id

    def getName(self):
        return self._name

    def getDescription(self):
        return self._description

    def getExtraOptions(self):
        return dict((option, self.getExtraOption(option))
                    for option in self._extraOptions)

    def getExtraOption(self, optionName):
        if optionName in self._extraOptions:
            return getattr(self, "_%s" % optionName)
        else:
            raise Exception('unknown option!')

    def setExtraOption(self, optionName, value):
        if optionName in self._extraOptions:
            setattr(self, "_%s" % optionName, value)
        else:
            raise Exception('unknown option!')

    def setParameters(self, description = None,
                      name = None):
        if description:
            self._description = description
        if name:
            self._name = name


class AgentProviderComponent(Component):
    """
    This class only serves the purpose of letting LiveSync know that an
    agent type exists
    """

    zope.interface.implements(ILiveSyncAgentProvider)

    # ILiveSyncAgentProvider
    def providesLiveSyncAgentType(self, obj, types):
        if hasattr(self, '_agentType'):
            types[self._agentType.__name__] = self._agentType


class PushSyncAgent(SyncAgent):

    def run(self, currentTS, logger = None):

        self._v_logger = logger

        if not self._manager:
            raise AgentExecutionException("SyncAgent '%s' has no manager!" % self._id)

        # query till currentTS - 1, for integrity reasons
        data = self._manager.query(agentId = self.getId(),
                                   till = currentTS - 1)

        if logger:
            logger.info("Querying agent %s for events till %s" % (self.getId(),
                                                                  currentTS - 1))

        # run agent-specific cycle
        self._lastTry = self._run(self._manager, data, currentTS - 1)

        return self._lastTry

    def acknowledge(self):
        self._manager.advance(self.getId(), self._lastTry)


class SyncManager(Persistent):
    """
    Stores live sync configuration parameters and "agents". It is  basically an
    "Agent Manager"
    """

    @classmethod
    def getDBInstance(cls):
        storage = getPluginType().getStorage()
        return storage['agent_manager']

    def __init__(self):
        self.reset()

    def reset(self, agentsOnly = False, trackOnly = False):
        """
        Resets database structures
        """
        if not trackOnly:
            self._agents = mapping.PersistentMapping()
        if not agentsOnly:
            self._track = SetMultiPointerTrack()

    def registerNewAgent(self, agent):
        """
        Registers the agent, placing it in a mapping structure
        """
        self._agents[agent.getId()] = agent

        # create a new pointer in the track
        self._track.addPointer(agent.getId())

        # impose myself as its manager
        agent.setManager(self)

    def removeAgent(self, agent):
        """
        Removes an agent
        """
        self._track.removePointer(agent.getId())
        del self._agents[agent.getId()]

    def query(self, agentId = None, till = None):

        # TODO: Add more criteria! (for now this will do)

        if agentId == None:
            raise QueryException("No criteria specified!")

        return self._track.pointerIterItems(agentId, till = till)

    def advance(self, agentId, newLastTS):
        self._track.movePointer(agentId, max(self._track.mostRecentTS(), newLastTS))

    def add(self, timestamp, action):
        if type(action) == list:
            for a in action:
                # TODO: bulk add at low level?
                self._track.add(timestamp, a)
        else:
            # TODO: timestamp conversion (granularity)!
            self._track.add(timestamp, action)

    def getTrack(self):
        return self._track

    def getAllAgents(self):
        return self._agents

