#!/bin/sh

# Generates Python eggs for 2.4, 2.5 and 2.6
# -d can be passed for 'nighly builds', so that the current date is appended

DATEOPT=

while getopts "d" Option
do
  case $Option in
    d     ) DATEOPT=-d;;
  esac
done

for EXECUTABLE in python2.6 python2.5 python2.4; do
    $EXECUTABLE setup.py egg_info $DATEOPT bdist_egg
    EGG_NAME=dist/`$EXECUTABLE setup.py egg_filename | tail -n 1`.egg
    md5sum $EGG_NAME | sh -c 'read a; echo ${a%% *}' > $EGG_NAME.md5
done
