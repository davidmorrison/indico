# -*- coding: utf-8 -*-
##
##
## This file is part of CDS Indico.
## Copyright (C) 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010 CERN.
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
Utility functions
"""


def get_query_parameter(queryParams, keys, default=None, integer=False):
    if type(keys) != list:
        keys = list(keys)
    for k in keys:
        paramlist = queryParams.get(k)
        if paramlist:
            if len(paramlist) == 1:
                val = paramlist[0]
                if integer:
                    val = int(val)
                del queryParams[k]
                return val
            else:
                raise Exception("duplicate argument' %s'!" % k)
    return default

def remove_lists(data):
    return dict((k, v[0]) for (k, v) in data.iteritems() if v != None)
