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
This is the part of the API that deals with database updates, and initialization
of database structures for new components
"""

from indico.core.extpoint import IListener


class IDBUpdateListener(IListener):
    """
    This interface should be applied to classes that will serve as "drivers"
    for the update process of the DB, due to installation of new versions of plugins,
    or other components (or Indico itself).

    Basically the update/migration script should notify listeners of
    "updateDBStrucures", telling them which module is being updated and versions
    involved
    """

    def updateDBStructures(self, object, fromVersion, toVersion, root):
        """
        `object` is simply a string specifying the name of the component. Normally,
        package names should be enough (`indico`, `indico.ext.foo` ...)
        `fromVersion` and `toVersion` specify the version numbers in case of update.
        They are passed as `None` in case it is the first time this component
        is installed.
        `root` is the database root, passed just for convenience.
        """

class DBUpdateException(Exception):
    """
    Raised in case a database update fails (i.e. database in inconsistent state)
    """
