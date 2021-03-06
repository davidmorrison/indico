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
Fossils for tasks
"""

from indico.util.fossilize import IFossil
from indico.util.fossilize.conversion import Conversion

class ITaskFossil(IFossil):
    """
    A fossil representing a scheduler task
    """
    def getId():
        pass

    def getTypeId():
        pass

    def getStartOn():
        pass
    getStartOn.convert = Conversion.datetime

    def getStartedOn(self):
        pass
    getStartedOn.convert = Conversion.datetime

    def getEndedOn():
        pass
    getEndedOn.convert = Conversion.datetime

    def getCreatedOn():
        pass
    getCreatedOn.convert = Conversion.datetime


class ITaskOccurrenceFossil(IFossil):
    """
    A task occurrence
    """

    def getId():
        pass

    def getStartedOn(self):
        pass
    getStartedOn.convert = Conversion.datetime

    def getEndedOn(self):
        pass
    getEndedOn.convert = Conversion.datetime

    def getTask(self):
        pass
    getTask.result = ITaskFossil
