# -*- coding: utf-8 -*-
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
Migration script: v0.97 -> v0.98
"""

import sys
import traceback

from MaKaC.common import DBMgr
from MaKaC.common.Counter import Counter
from MaKaC.conference import ConferenceHolder
from MaKaC.common.timerExec import HelperTaskList
from MaKaC.plugins.base import PluginType
from MaKaC.plugins.base import PluginsHolder

from indico.ext import livesync
from indico.util import console


def runTaskMigration(dbi):
    """
    Migrating database tasks from the old format to the new one
    """
    for t in HelperTaskList().getTaskListInstance().getTasks():
        print t
        # TODO: finish this

    dbi.commit()


def runConferenceMigration(dbi):
    """
    Adding missing attributes to conference objects
    """

    ch = ConferenceHolder()

    for conf in ch.getList():
        if hasattr(conf, '__alarmCounter'):
            raise Exception("Conference Object %s (%s) seems to have been already "
                            "converted" % (conf, conf.id))

        existingKeys = conf.alarmList.keys()
        existingKeys.sort()
        nstart = int(existingKeys[-1]) + 1 if existingKeys else 0
        conf._Conference__alarmCounter = Counter(nstart)

        # TODO: For each conference, take the existing tasks and convert them to
        # the new object classes.
        # It is important to save the state of the alarm (sent or not)

    dbi.commit()


def runPluginMigration(dbi):
    """
    Adding new plugins and adapting existing ones to new name policies
    """
    root = dbi.getDBConnection().root()
    if 'plugins' in root:
        ptl = []
        ps = root['plugins']
        for k, v in ps.iteritems():
            if isinstance(v, PluginType):
                ptl.append(v)
        for pt in ptl:
            pt.setUsable(True)
            for p in pt.getPluginList(includeNonPresent=True,
                                      includeTestPlugins=True,
                                      includeNonActive=True):
                # new ids have no spaces
                p.setId(p.getName().replace(" ", ""))
                p.setUsable(True)
    dbi.commit()

    # load new plugins, so that we can update them after
    PluginsHolder().reloadAllPlugins()
    dbi.commit()

    # update db for specific plugins
    livesync.db.updateDBStructures(root)
    dbi.commit()


def runMigration():
    tasks = [runPluginMigration, runTaskMigration, runConferenceMigration]

    print "\nExecuting migration...\n"

    dbi = DBMgr.getInstance()

    for task in tasks:
        print console.colored("->", 'green', attrs=['bold']), \
              task.__doc__.replace('\n', '').strip()
        dbi.startRequest()
        task(dbi)
        dbi.endRequest()
        print console.colored("   DONE\n", 'green', attrs=['bold'])

    print console.colored("Database Migration successful!\n",
                          'green', attrs=['bold'])

def main():
    """
    Main program cycle
    """

    print console.colored("""\nThis script will migrate the Indico DB from v0.97.x to v0.98. We recommend that
this operation be executed while the web server is down, in order to avoid
concurrency problems and DB conflicts.\n\n""", 'yellow')

    if console.yesno("Are you sure you want to execute the "
                     "migration now?"):
        try:
            return runMigration()
        except:
            print console.colored("\nMigration failed! DB may be in "
                                  " an inconsistent state:", 'red', attrs=['bold'])
            print console.colored(traceback.format_exc(), 'red')
    else:
        return 1


if __name__ == "__main__":
    sys.exit(main())