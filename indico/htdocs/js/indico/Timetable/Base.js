var TimetableDefaults = {
    topMargin: 30,
    bottomMargin: 40,
    leftMargin: 55,
    rightMargin: 5,
    resolution: 1,
    menuWidth: 150,
    blockMargin: 4,        // Margin used inside timetable blocks
    wholeday : 7,              // # of hours of duration for a timetable event to be seen as be during the whole day.
    minContribHeight: 20,      // Minimum height for a contrib displayed inside a session TODO: remove?
    layouts: {'compact': {name: "Compact",
                          values : {
                              pxPerHour: 60,
                              pxPerSpace: 2,
                              minPxPerBlock: 50
                          },
                          manager: new CompactLayoutManager()},

              'proportional': {name: 'Proportional',
                               values : {
                                   pxPerHour: 50,
                                   minPxPerBlock: 25
                               },
                               manager: new ProportionalLayoutManager()
                              },

              'poster': {name: 'Poster',
                         manager: new PosterLayoutManager()
                        },

              'room': {name: 'Room',
                       manager: new RoomLayoutManager()
                      }
             },
    filters: {'session': {name: $T('Session'),
                          filter: new SessionFilter()},
              'room': {name: $T('Room'),
                       filter: new RoomFilter()}}
};


type("TimeTable", ["HistoryListener"], {

    /*
     * Translates the keys used in the data dictionary into titles
     * displayed in the tab control
     */


    _draw: function(timetableDiv) {
        return $('<div/>').css({width: this.width}).append(
            $('<div/>').css('display', 'block'),
            this.legend,
            this.header.dom,
            timetableDiv.dom,
            this.loadingIndicator.dom).get();
    },

    _getMenu: function() {
        return Html.div();
    },

    postDraw: function() {
        this.timetableDrawer.postDraw();
        this.LookupTabWidget.prototype.postDraw.call(this);
    },

    getData: function() {
        return this.data;
    },

    getById: function(id) {

        var info = Util.parseId(id);
        var type = info[0];
        var compositeId = "";
        info = info.slice(2);

        if (type == 'Conference') {
            return this.eventInfo;
        }
        else if (type == 'Contribution') {
            throw 'not implemented!';
        } else if (type=='Session'){
            return this.eventInfo.sessions[info[0]];
        } else if (type=='SessionSlot'){
            compositeId = 's'+info[0]+'l'+info[1];
        } else {
            throw 'unrecognized id!';
        }

        for (day in this.data) {
            if (this.data[day][compositeId]) {
                return this.data[day][compositeId];
            }
        }
    },

    getTimetableDrawer: function() {
        return this.timetableDrawer;
    },

    setData: function(data, intervalData, startTime, endTime) {
            this.timetableDrawer.setData(data, startTime, endTime);
    },

    _createLoadingIndicator: function() {
        return Html.div('timetableLoading', $T('Updating the timetable...'));
    },
    /*
      * To be overloaded. Header content displayed above the timetable.
      */
    _getHeader: function() {
        return Html.div({});
    },

    /*
      * To be overloaded. Returns the small "Session legend" displayed in
      * detailed mode (only).
      */
    _getLegend: function() {
            return Html.div({});
    },
    /*
      * To be overloaded. Returns buttons to be displayed below the tabs in
      * the tab widget.
      */
    _functionButtons: function() {
        return [];
    },

    redrawLegend: function() {
        return;
    }
},
     function(data, width, wrappingElement, detailLevel, managementMode) {
         var self = this;

         this.data = data;

         this.enabled = true;

         this.processedWarnings = new WatchList();

         this.width = width;
         this.loadingIndicator = this._createLoadingIndicator();
         this.header = this._getHeader();
         this.legend = $('<div/>');
         this.showNumSessions = 4; //Number of sessions shown in the legend by default, used by getLegend(..)
     }
    );


type("DisplayTimeTable", ["TimeTable"], {

    filterMenu: function() {
        var self = this;

        var filterLink = Html.a({href: '#'}, $T("Filter"));
        this.filterMenu = new TimetableFilterMenu(filterLink, self.timetableDrawer);

        filterLink.observeClick(function(e) {
            var pos = filterLink.getAbsolutePosition();
            self.filterMenu.open(pos.x + filterLink.dom.offsetWidth, pos.y);
            return false;
        });

        return Html.ul({className: "inner", style: {display: 'none'}},
                       Html.li("menuConfMiddleCell",
                               filterLink));
    },

    printMenu: function() {
        var self = this;

        var printLink = Html.a({href: '#'}, $T("Printable version"));
        printLink.observeClick(function(e) {

            self.print();

        });
        return Html.ul({className: "inner", style: {display: 'none'}},
                       Html.li("menuConfMiddleCell",
                               printLink));
    },
    print: function() {
        var self = this;

        var bodyPadding = $E(document.body).dom.style.padding;
        var timetableElements = translate(self.timetableDrawer.canvas.dom.childNodes, function(value) {return $E(value);});
        var elements = translate($E(document.body).dom.childNodes, function(value) {return $E(value);});

        var goBackLink = Html.a({href: window.location.hash, style: {fontSize: '17px'}}, $T('Go back'));
        var printLink = Html.a({href: window.location.hash, style: {fontSize: '17px'}}, $T('Print'));

        var links = Html.span({style: {cssFloat: 'right'}}, printLink, ' | ', goBackLink);

        var headerStyle = {padding: '0px 5px 5px 5px',
            borderBottom: '1px solid black',
            textAlign: 'center',
            width: pixels(self.timetableDrawer.width)};
        var header = Html.div({className: 'timetableHeader clearfix', style: headerStyle}, links,
            Html.span({style: {cssFloat: 'left'}}, self._titleTemplate(self.timetableDrawer.day)));

        goBackLink.observeClick(function(e) {
            $E(document.body).setStyle('padding', bodyPadding);
            $E(document.body).set(elements);
            self.timetableDrawer.setPrintableVersion(false);
        });
        printLink.observeClick(function(e) {
            window.print();
        });

        var timetableDiv = Html.div({style: {paddingTop: pixels(20), position: 'relative'}}, timetableElements);
        $E(document.body).set(header, timetableDiv);

        $E(document.body).setStyle('padding', pixels(30));
    },

    pdf: function() {
        window.location = Indico.Urls.ConfTimeTableCustomPDF + '?confId=' + this.eventInfo.id + '&showDays=all&showSessions=all';
    },

    fullScreen: function() {
        var self = this;

        //self.timetableDrawer.setPrintableVersion(true);

        var bodyPadding = $E(document.body).dom.style.padding;
        var elements = translate($E(document.body).dom.childNodes, function(value) {return $E(value);});
        IndicoUI.Dialogs.Util.progress($T("Switching to full screen mode..."));

        var goBackLink = Html.a({href: window.location.hash, style: {fontSize: '17px'}}, $T('Go back'));

        var links = Html.span({style: {cssFloat: 'right'}}, goBackLink);

        self.previousWidth = self.timetableDrawer.width;

        goBackLink.observeClick(function(e) {
            IndicoUI.Dialogs.Util.progress($T("Switching to normal mode..."));
            // This timeout is needed in order to give time to the progress indicator to be rendered
            setTimeout(function(){
                self.timetableDrawer.width = self.previousWidth;
                self.timetableDrawer.setPrintableVersion(false);
                $E(document.body).setStyle('padding', bodyPadding);
                $E(document.body).set(elements);
                self.timetableDrawer.redraw(self.currentDay);
            }, 50);
        });

     // This timeout is needed in order to give time to the progress indicator to be rendered
        setTimeout(function(){
            self.timetableDrawer.width = $E(document.body).dom.clientWidth - 50; // 50 is a width offset.

            var headerStyle = {padding: '0px 5px 5px 5px',
                    borderBottom: '1px solid black',
                    textAlign: 'center',
                    width: pixels(self.timetableDrawer.width)};
            var header = Html.div({className: 'timetableHeader clearfix', style: headerStyle}, links,
                Html.span({style: {cssFloat: 'left'}}, self._titleTemplate(self.timetableDrawer.day)));

            self.timetableDrawer.redraw(self.currentDay);
            var timetableElements = translate(self.timetableDrawer.canvas.dom.childNodes, function(value) {return $E(value);});
            var timetableDiv = Html.div({style: {width:pixels(self.timetableDrawer.width), paddingTop: pixels(20), position: 'relative'}}, timetableElements);
            $E(document.body).set(header, timetableDiv);
            $E(document.body).setStyle('padding', pixels(30));
        }, 50);
    },

    _filterSetup: function() {
        var self = this;
        this.filter = new TimeTableFilter(this.timetableDrawer, function () {
            // When closed restore the filter button color
            self.filterButtonContainer.dom.style.background = "";
            return true;
        });
        this.filter.draw();
    },

    toggleDetailedView: function() {
        var self = this
        var detailLevel = this.timetableDrawer.detail.get();
        var newDetailLevel = detailLevel == 'contribution' ? 'session' : 'contribution';
        this.timetableDrawer.detail.set(newDetailLevel);
        var state = (newDetailLevel == 'contribution');
        this.inDetailedMode = state;
        //detailsButton.btn.set(state ? "Hide details" : "Show details");
        this.detailsButton.btn.getParent().dom.style.background = state ? "#9F883B" : "";
        this._addToHistory(this.currentDay + (state?'.detailed':''));

        var legend;

        //If the "Detailed view" button is clicked and "activated".
        if(this.inDetailedMode) {
            /* Draw legend or "undraw" legend (getLegend() returns an empty div)
               when toggling for detailed view. */
            legend = this._getLegend();
            this.legend.replaceWith(legend)

            if (this._legendActive) {
                self._toggleLegend(true);
            } else {
                self._legendPostDraw();
            }
        } else {
            if (this._legendActive) {
                self._toggleLegend(false);
            }
            legend = $('<div/>');
            this.legend.replaceWith(legend)

        }
        this.legend = legend;
    },

    _functionButtons: function() {
        var self = this;

        this.printButton = {'btn': Html.div('printButtonWhite', $T('Print')),
            'onclick': function(btnContainer) {
                self.print();
            }
        };

        this.pdfButton = {'btn': Html.div('buttonWhite', $T('PDF')),
                'onclick': function(btnContainer) {
                    self.pdf();
                }
        };

        this.fullScreenButton = {'btn': Html.div('buttonWhite', $T('Full screen')),
                'onclick': function(btnContainer) {
                    self.fullScreen();
                }
        };

        // TODO: Needs to be implemented
        this.linkButton = Html.div('linkButtonWhite', $T('Link'));

        this.detailsButton = {'btn': Html.div({className: 'buttonWhite', id: 'detailsButton'},
                                               Html.span({}, $T('Detailed view'))),
            'onclick': function() {self.toggleDetailedView();}};

        this.filterButton = {'btn': Html.div('buttonWhite', $T('Filter')),
            'onclick': function(btnContainer) {
              // Save the container so that the filter button background
              // color can be restored when filter is closed
              self.filterButtonContainer = btnContainer;
              self.filter.toggle();
              var state = self.filter.state.get();
              self._filterActive = state;
              btnContainer.dom.style.background = state ? "#9F883B" : "";
            }
        };

        return [this.printButton,
                this.pdfButton,
                this.fullScreenButton,
                this.detailsButton,
                this.filterButton];
        }
    },
     function(data, width, wrappingElement, detailLevel) {
         this.TimeTable(data, width, wrappingElement, detailLevel, false);

         // Set data[all] so that the All days tab is created
         if (keys(data).length > 1) {
             this.data.all = data;
         }
     }
    );


type("TopLevelTimeTableMixin", ["LookupTabWidget"], {

    draw: function() {
      return this.LookupTabWidget.prototype.draw.call(this);
    },

    getDays: function() {
        return this.sortedKeys;
    },

    disable: function() {
        this.enabled = false;
        this.LookupTabWidget.prototype.disable.call(this);
    },

    enable: function() {
        this.enabled = true;
        this.LookupTabWidget.prototype.enable.call(this);
    },

    _titleTemplate : function(text) {
        if (text == 'all') {
            return $T('All days');
        }

        var day = text.substring(6,8);
        var month = text.substring(4,6);

        var strDate =  day + '/' + month + '/' + text.substring(0,4);

        //var nDate = new Date();
        var delements = parseDate(strDate);
        var nDate = new Date(delements[2], delements[1]-1, delements[0]);

        return Indico.Data.WeekDays[nDate.getDay()].substring(0,3)+' '+day+'/'+month;

    },


    _parseDayInterval: function(hash) {
        var m = hash.match(/#(\d{8}|all)(?:\.((?:s\d+l\d+)|detailed))?/);

        if (m) {
            return [m[1],m[2]];
        } else {
            return [null, null];
        }
    },

    switchToInterval : function(intervalId) {
        this.disable();

        var intervalInfo = this.data[this.currentDay][intervalId];
        var data = intervalInfo.entries;

        this.intervalTimeTable = new IntervalManagementTimeTable(this,
                                                                 data,
                                                                 intervalInfo,
                                                                 this.eventInfo,
                                                                 this.width.slice(0,-2),
                                                                 this.canvas,
                                                                 'contribution',
                                                                 this.isSessionTimetable,
                                                                 this.customLinks);

        this.intervalTimeTable.setData(intervalInfo);
        var content = this.intervalTimeTable.draw();
        this.canvas.set(content);
        this.menu.dom.style.display = 'none';

    },

    postDraw: function() {
        this.TimeTable.prototype.postDraw.call(this);
        var self = this;

    },

    switchToTopLevel : function() {
        this.enable();
        this.setSelectedTab(this.currentDay);
        this._drawContent();
        this.menu.dom.style.display = 'block';
        this.timetableDrawer.redraw();
    }
},
     function(data, width, wrappingElement, detailLevel, managementActions, historyBroker, timetableLayoutId) {

         var self = this;

         this.managementActions = managementActions;

         this.canvas = Html.div({});

         historyBroker.addListener(this);

         this.timetableDrawer = new TimetableDrawer(this, width,
                                                    wrappingElement,
                                                    detailLevel,
                                                    this._functionButtons(),
                                                    this.loadingIndicator,
                                                    !!managementActions,
                                                    managementActions,
                                                    timetableLayoutId);

         this.sortedKeys = keys(this.data);
         this.sortedKeys.sort();


         var today = new Date();
         var todayStr = IndicoUtil.formatDate2(today);

         var originalHash = window.location.hash;

         var dayAndInterval = this._parseDayInterval(originalHash);
         var initialTab = null;

         if (dayAndInterval[0]) {
             initialTab = dayAndInterval[0];
         }

         // if nothing is found
         if (initialTab === null) {
             // look for today
             if (exists(data[todayStr])) {
                 initialTab = todayStr;
             } else {
                 // otherwise use the default
                 initialTab = this.sortedKeys[0];
             }
         }

         this.currentDay = initialTab;

         this.LookupTabWidget( translate(this.sortedKeys, function(key) {

             return [key, function() {

                 detailed = self.inDetailedMode?'.detailed':'';

                 self.currentDay = key;
                 // each time one tab is clicked,
                 // drawDay is called over a different day
                 if (key == 'all') {
                     self._addToHistory('all' + detailed);
                     return self._draw(self.timetableDrawer.drawAllDays());
                 } else {

                     // Are we switching to interval mode
                     if (!self.enabled) {
                         // stop everything, we don'w want the LookupTabWidget
                         // to replace the contents
                         throw "stopDrawing";
                     }

                     self._addToHistory(key + detailed);
                     return self._draw(self.timetableDrawer.drawDay(key));
                 }
             }];
         }), this.width, 100, initialTab, this._functionButtons(), this.canvas);

         if (dayAndInterval[1]) {
             var subref = dayAndInterval[1];
             // TODO: replace with appropriate notification system
             setTimeout(function() {
                 if (subref == 'detailed') {
                     self.toggleDetailedView();
                 } else {
                     self.switchToInterval(subref);
                 }
             }, 500);
         }

     });


type("IntervalTimeTableMixin", [], {

    draw: function() {
        // Add hash to history
        this.parentTimetable._addToHistory(this.currentDay + '.' + this.contextInfo.id);

        return this._draw(this.timetableDrawer.drawDay(this.currentDay));
    },

    _getInfoBoxContent: function() {

        return Html.div({}, Html.span({style: {fontStyle: 'italic', fontSize: '0.9em'}},
            $T('You are viewing the contents of the interval:')),
            Html.div({style: {fontWeight: 'bold', marginTop: '5px', fontSize: '1.3em'}},
            this._generateSlotTitle(this.contextInfo),
            Html.span({style: {fontWeight: 'normal'}},
            " (", $B(Html.span({}), this.slotStartTime), " - ", $B(Html.span({}), this.slotEndTime),")" )));
    },

    setData: function(data) {
        var day = IndicoUtil.formatDate2(IndicoUtil.parseJsonDate(data.startDate));
        var ttData = {};

        this.data = data.entries;

        // WatchValues, so that interval changes can be handled
        this.slotStartTime = new WatchValue(data.startDate.time.substring(0,5));
        this.slotEndTime = new WatchValue(data.endDate.time.substring(0,5));

        ttData[day] = data.entries;

        this.currentDay = day;
        this.timetableDrawer.setData(ttData, day, data.isPoster);

        // The time must be update each time new data is set
        this.infoBox.set(this._getInfoBoxContent());

    },

    getDays: function() {
        return this.parentTimetable.getDays();
    },

    getById: function(id) {
        return this.parentTimetable.getById(id);
    }


},
     function(parent, width, wrappingElement, managementActions) {

         this.managementActions = managementActions;
         this.parentTimetable = parent;

         this.timetableDrawer = new IntervalTimetableDrawer(this, width,
                                                            wrappingElement,
                                                            this._functionButtons(),
                                                            this.loadingIndicator,
                                                            !!managementActions,
                                                            managementActions);
     });


type("ManagementTimeTable",["TimeTable"], {

    _generateSlotTitle: function(slotData) {
        return slotData.title + (slotData.slotTitle ? ": " + slotData.slotTitle : '');
    },


    _createInfoArea: function() {

        // this is a client-side hack that compensates some algorithm weaknesses

        var closeButton = Html.div({
            className: 'balloonPopupCloseButton',
            style: {position: 'absolute',
            top: '10px',
            right: '10px',
            padding: '0px'}
        });

        var self = this;

        closeButton.observeClick(function() {
            self._hideWarnings();
        });

        return Html.div("timetableManagementInfoArea",
                        Html.div({}, $T("Your changes triggered the automatic modification of some settings:")),
                        $B(Html.ul({}),
                           this.processedWarnings,
                           function(item) {

                               var title = item[4];
                               var atoms = Util.parseId(item[1]);

                               var message = {
                                   OWNER_START_DATE_EXTENDED: {
                                       SessionSlot : $T('The <strong>starting time</strong> of the session interval <strong>')  + title + $T('</strong> was moved from '),
                                       Session: $T('The <strong>starting time</strong> of the session interval <strong>')  + title  + $T('</strong> was moved from '),
                                       Conference: $T('The <strong>starting time</strong> of the <strong>Conference</strong> was moved from ')
                                   },
                                   OWNER_END_DATE_EXTENDED: {
                                       SessionSlot : $T('The <strong>ending time</strong> of the session interval <strong>') + title + $T('</strong> was moved from '),
                                       Session: $T('The <strong>ending time</strong> of the session interval <strong>') + title + $T('</strong> was moved from '),
                                       Conference: $T('The <strong>ending time</strong> of the <strong>Conference</strong> was moved from ')
                                   },
                                   ENTRIES_MOVED: {
                                       SessionSlot: $T('The contents of the interval <strong>') + title + $T('</strong> were moved from ')
                                   }
                               }[item[0]][atoms[0]];

                               var span = Html.span({style: {verticalAlign: 'middle', marginLeft: '5px'}});
                               span.dom.innerHTML = message + ' <strong>' + item[3] +
                                   '</strong>' + $T(' to ') + '<strong>' + item[2] + '</strong>' ;
                               return Html.li({}, span);
                           }),
                       closeButton);
    },

    /*
     *
     * Is called every time a timetable entry has been successfully
     * added or updated. Updates and redraws the timetable.
     * @param originalArgs this are the original args. If they are passed, we can remove the entry
     * from the index before adding it again (just in case the date has changed).
     *
     */

    _processAutoOps: function(result) {
        this._hideWarnings();

        var self = this;

        if (result.autoOps && result.autoOps.length > 0) {
            each(result.autoOps,
                 function(op) {

                     var warning = self._processWarning(op);
                     if (warning && self.processedWarnings.indexOf(warning) === null) {
                         self.warningArea.dom.style.display = 'block';
                         self.processedWarnings.append(warning);
                     }
                 });
        }
    },

    _hideWarnings: function() {
        this.warningArea.dom.style.display = 'none';
        this.warnings.clear();
        this.processedWarnings.clear();
    },

    _processWarning: function(entry) {
        /*
         * entry - the warning 'entry', a list [src, msg, target, newValue]
         * startTime - the original starting time for the timeblock
         * endTime - the original ending time for the timeblock
         * [slotTitle] - title, if the entry is a slot
         */

        var msg = entry[1];
        var finalTime = entry[3];

        var type = Util.parseId(entry[2])[0];

        var slot = null;
        var title = "";

        var startTime = "";
        var endTime = "";

        if (type == "Session") {
            return null;
        } else if (type == 'Conference') {
            conference = self.timetable.getById(entry[2]);
            title = conference.title;
            startTime = conference.startDate.time.slice(0,5);
            endTime = conference.endDate.time.slice(0,5);
        } else if (type == 'SessionSlot') {
            slot = this.getById(entry[2]);
            startTime = slot.startDate.time.slice(0,5);
            endTime = slot.endDate.time.slice(0,5);
            title = this._generateSlotTitle(slot);
        }

        if (msg == "OWNER_END_DATE_EXTENDED") {
            // Make sure that something changed, otherwise the
            // warning will be supressed
            if (endTime != finalTime) {
                // slice(1) to ignore first value
                return concat(entry.slice(1),  [endTime, title]);
            }
        } else if (msg == "OWNER_START_DATE_EXTENDED") {
            // Again, make sure that something changed

            if (startTime != finalTime) {
                // slice(1) to ignore first value
                return concat(entry.slice(1), [startTime, title]);
            }
        } else {
            return concat(entry.slice(1), [startTime, title]);
        }

        return null;
    },

    _getHeader: function() {

        var self = this;

        this.infoBox = Html.div({className: 'timetableInfoBox'});

        if (this.contextInfo.isPoster) {
            this.addMenuLink = Html.a({className: 'fakeLink', style: {margin: '0 15px'}}, 'Add poster');
            this.addMenuLink.observeClick(function() {
                self.managementActions.addContribution();
            });
        }else {
            this.addMenuLink = Html.a({className: 'dropDownMenu fakeLink', style: {margin: '0 15px'}}, 'Add new');
            this.addMenuLink.observeClick(function() {
                self.managementActions._openAddMenu(self.addMenuLink, self.contextInfo);
            });
        }

        this.separator = Html.span({}, " | ");

        this.rescheduleLink = Html.span({className: 'fakeLink', style:{paddingLeft: pixels(15), paddingRight: pixels(15)}}, $T('Reschedule'));
        this.rescheduleLink.observeClick(function(){
            var popup = new RescheduleDialog(self);
            popup.open();
        });

        this.addIntervalLink = Html.span({className: 'fakeLink', style:{paddingLeft: pixels(15), paddingRight: pixels(15)}}, $T('Add new block'));
        this.separator2 = Html.span({}, " | ");
        this.fitInnerTimetableLink = Html.span({className: 'fakeLink', style:{paddingLeft: pixels(15), paddingRight: pixels(15)}}, $T('Fit to content'));


        if (self.isSessionTimetable) {
            this.addIntervalLink.observeClick(function() {
                self.managementActions.addSessionSlot(self.eventInfo.timetableSession);
            });
        }

        this.fitInnerTimetableLink.observeClick(function(){
            var popup = new FitInnerTimetableDialog(self);
            popup.open();
        });

        var customLinks = Html.span({});
        for(linkName in this.customLinks){
            var linkDiv = Html.span({className: 'fakeLink', style:{paddingLeft: pixels(15), paddingRight: pixels(15)}}, $T(linkName));
            linkDiv.observeClick(function(event){
                var elem = event.srcElement?event.srcElement:event.currentTarget;
                var func = eval(self.customLinks[elem.innerHTML]);
                func(self);
            });
            customLinks.append("|");
            customLinks.append(linkDiv);
        }

        this.warningArea = this._createInfoArea();
        this.warningArea.dom.style.display = 'none';
        this.menu = Html.div({style: {cssFloat: 'right', color: '#777'}},
                             this.getTTMenu(),
                             this.addMenuLink,
                             this.addIntervalLink,
                             this.contextInfo.isPoster?null:this.separator,
                             this.contextInfo.isPoster?null:this.rescheduleLink,
                             this.contextInfo.isPoster?null:this.separator2,
                             this.contextInfo.isPoster?null:this.fitInnerTimetableLink,
                             customLinks);
        return Html.div({}, this.warningArea, Html.div('clearfix', this.menu, this.infoBox));
        },

},
     function(data, contextInfo, eventInfo, width, wrappingElement, detailLevel, customLinks) {
         this.customLinks = customLinks;
         this.eventInfo = eventInfo;
         this.contextInfo = contextInfo;
         this.warnings = new WatchList();
         this.TimeTable(data, width, wrappingElement, detailLevel, true);
     }
    );


type("TopLevelDisplayTimeTable", ["DisplayTimeTable", "TopLevelTimeTableMixin"], {

    _retrieveHistoryState: function(hash) {
        var currentDay = this._parseDayInterval(hash)[0];
        this.setSelectedTab(currentDay);
    },

    _getLegend: function() {
        var self = this;
        //Initially show N and have the rest hidden (buried under "...more")
        self._maxLegendItemsShownInitially = 4;

        var toggleLegendButton = $('<div id="legendMainToggle">' +
                                   $T("Session legend") + '</div>');

        if (this._legendActive) {
            toggleLegendButton.addClass('active');
        }

        toggleLegendButton.click(function() {
            self._legendActive = !self._legendActive;
            self._toggleLegend(self._legendActive);
        });

        self._toggleLegendButton = toggleLegendButton;

        this.legendItems = self._legendItemsContainer();
        // hide it so that we can execute the nice scroll down animation
        this.legendItems.hide();

        // create 'update' event that will be called when the day changes (redraw)
        this.legendItems.bind('update', function(){
            $(this).html(self._legendItemsContainer().children());
            if (self._legendActive && self.legendSessionInfo[self.currentDay].length){
                $(this).slideDown();
            } else {
                $(this).slideUp();
            }
            self._legendPostDraw();
        });

        return $('<div id="wholeLegend"/>').append(toggleLegendButton).append(this.legendItems);
    },

    _legendItemsContainer: function() {
        var self = this;
        var state = false;
        var moreText = $T("see more...");
        var showMoreLink = $('<a id="showMoreLink" class="showMoreLink">' + moreText + '</a>').click(
            function() {
                if(!state) {
                    self._fadeShowAllLegendItems();
                    showMoreLink.text($T('less...'));
                } else{
                    self._fadeHideLegendItems();
                    showMoreLink.text(moreText);
                }
                self._legendPostDraw();
                state = !state;
            });

        var closeButton = $('<div class="legendCloseButton"/>').click(function() {
            self._toggleLegend(false);
            self._legendActive = false;
        });

        var sessions = self.legendSessionInfo[this.currentDay];
        var container = $('<div id="timeTableLegend" class="timeTableLegend follow-scroll">').append(closeButton)

        if (sessions.length) {
            // Returns a div with each color + session name element
            var legendElements = self._generateLegendDivItems(sessions);
            container.append($('<div id="legendItemContainer"/>').append(legendElements))
            if (sessions.length > self._maxLegendItemsShownInitially) {
                container.append(showMoreLink);
            }
        }
        return container;
    },

    // Generates the "legend items"
    // (a small colored rounded square with the sessions title on its right hand side)
    // Returns a Div with those legend element items.
    _generateLegendDivItems: function(sessions) {
        var self = this;
        var showNumSessionsCounter = 0;
        var container = $('<div>');

        $.each(sessions, function(idx, l){
            var div =  $('<div class="legendItem" />').
                append($('<div class="timeTableItemColour" />').css('background', l[2]),
                       $('<span/>').text(l[1]));

            container.append(div)

            if (idx >= self._maxLegendItemsShownInitially){
                div.hide();
            }
        });
        return container;
    },

    redrawLegend: function() {
        if (this.legendItems) {
            this.legendItems.trigger('update');
        }
    },

    // Used by the "...more"-button when you want to show more elements
    _fadeShowAllLegendItems: function() {
        $('.legendItem').fadeIn();
    },

    // Used by the "...less"-button when you want to hide more elementsmaxLegendItemsShownInitially
    // Note, it does NOT HIDE ALL: depending on "maxLegendItemsShownInitially".
    _fadeHideLegendItems: function() {
        $('.legendItem').slice(this._maxLegendItemsShownInitially).fadeOut();
    },

    /* This function is also called in "this.filterButton" in order
       to hide it (the Session Legend) when the Filter is brought up */
    _toggleLegend: function(state) {
        var self = this;

        if (state) {
            $('#legendMainToggle').addClass('active');
            if (this.legendSessionInfo[this.currentDay].length) {
                $('#timeTableLegend').slideDown();
            }
        } else {
            $('#timeTableLegend').slideUp();
            $('#legendMainToggle').removeClass('active');
        }
        this._legendPostDraw();
    },

    _legendPostDraw: function() {
        var self = this;
        // loop for truncation of too long session titles,
        // the text next a coloured box in the "session legend".
        var initialTruncing = null;
        var i = 0;

        // Loop through each legend item
        $('.legendItem').each(function(){
            var titleIsTruncated = false;
            var fullTitle = $(this).text();
            initialTruncing = fullTitle.length;
            // Keep truncating the title until its short enough to be written in
            // one line and still less wide than the
            // "maximum legend item width".

            var span = $(this).children('span');

            while(span.get(0).offsetHeight > 25 || span.get(0).offsetWidth > 130) {
                titleIsTruncated = true;
                var truncSessionTitle = TimetableBlockBase.prototype.truncateTitle(--initialTruncing, fullTitle);
                span.html(truncSessionTitle);
            }

            if(titleIsTruncated) {
                $(this).qtip({content: fullTitle, position: {my: 'top middle', at: 'bottom middle'}});
            }
        });

        if ($('#detailsButton').length) {
            $('#legendMainToggle').position({my: 'left top',
                                             at: 'left bottom',
                                             of: $('#detailsButton').parent('.buttonContainer')});
            $('#timeTableLegend:visible').width($('#timeTableLegend').get(0).clientWidth-10);
        }

    },

    _extractSessionInfo: function(data) {
        // get an a dictionary where the keys are days and the values are lists
        // of [id, title, color] tuples (sessions only)
        var days = {};
        _(data).each(function(entries, day){
            days[day] = _(entries).chain().
                select(function(e){ return e.entryType == 'Session' }).
                map(function(s){ return [s.id, s.title, s.color] }).
                sortBy(function(l){return l[0]}).value();
        });
        // for "all days", put it all together
        days['all'] = _(days).chain().map(function(entries, day){ return entries }).
            reduce(function(l, elem){ return l.concat(elem); }, []).uniq().value();
        return days;
    }
},
     function(data, contextInfo, width, wrappingElement, detailLevel, historyBroker, timetableLayoutId) {
         this.postDraw = TopLevelTimeTableMixin.prototype.postDraw;
         this.legendSessionInfo = this._extractSessionInfo(data);
         this._legendActive = true;

         this.DisplayTimeTable(data, width, wrappingElement, detailLevel);
         this.TopLevelTimeTableMixin(data, width, wrappingElement, detailLevel, null, historyBroker, timetableLayoutId);

         this.eventInfo = contextInfo;
         this._filterSetup();
     });


type("TopLevelManagementTimeTable", ["ManagementTimeTable", "TopLevelTimeTableMixin"], {

    _deleteOldEntry: function(data, result, oldEntryId) {
        /*
         * Deletes the old version of the entry
         */

        var oldStartTime, oldEndTime, oldStartDate;
        // Check whether we're operating *over* an existing slot or not
        // it is a slot && slot exists in timetable
        if (result.entry.entryType=="Session" && data[this.currentDay][result.id]) {
            var slot = data[this.currentDay][result.entry.id];
            //var slot = data[result.day][result.entry.id];
            // in the affirmative case, fetch the time limits
            oldStartTime = slot.startDate.time.slice(0,5);
            oldEndTime = slot.endDate.time.slice(0,5);
            oldStartDate = slot.startDate.date.replaceAll('-','');

        } else {
            // Contribution or break - event timetable limits

            var entry = data[result.day][result.entry.id];

            oldStartTime = this.eventInfo.startDate.time.slice(0,5);
            oldEndTime = this.eventInfo.endDate.time.slice(0,5);
            oldStartDate = this.currentDay;
        }

        var oldEntries = data[oldStartDate][oldEntryId]?data[oldStartDate][oldEntryId].entries:null;

        delete data[oldStartDate][oldEntryId];

        return oldEntries;

    },

    _updateEntry: function(result, oldEntryId, updateCycle) {

        var data = this.getData();

        // AutoOp Warnings (before updates are done)
        this._processAutoOps(result);

        // Deletes the old version of the entry and temporarily
        // stores the entry contents to be used later on this function
        var oldContent = this._deleteOldEntry(data, result, oldEntryId);

        // Here's the update cycle
        if (updateCycle) {
            updateCycle(data);
        } else {

            // If none is defined in the function args,
            // execute the default action
            data[result.day][result.id] = result.entry;

            // A session interval may contain entries, that
            // should be preserved (e.g. content (contribs, breaks) of
            // the slot).
            if (oldContent) {
                data[result.day][result.id].entries = result.entry.entryType == "Session"?result.entry.entries:oldContent;
            }

            // If a session slot is added, let's update the list of sessions
            if (result.session) {
                this.eventInfo.sessions[result.session.id] = result.session;
            }

        }

        // Check if the result overflows the conference ending time
        if ((result.day == this.eventInfo.endDate.date.replaceAll('-','')) &&
            (result.entry.endDate.time.replaceAll(':','') >
             this.eventInfo.endDate.time.replaceAll(':',''))) {
            this.eventInfo.endDate.time = result.entry.endDate.time;
        }

        this.timetableDrawer.redraw();
    },

    /**
     * updateDay should be used when all the entries for a given day will be changed by the
     * info received in 'result'.
     *
     * result must contain:
     *
     *     result.id: string with a given day, e.g. "20100828"
     *     result.entry: all entries for a given day
     *
     */
    _updateDay: function(result) {

        this._processAutoOps(result);

        var data = this.getData();

        var entry = {};
        entry[result.id] = result.entry; // entry contains a whole day

        extend(data, entry);

        if (exists(result.session)) {
            this.eventInfo.sessions[result.session.id] = result.session;
        }

        // Check if the result overflows the conference ending time
        var latestTime = null;
        for(var key in result.entry) {
            if(!latestTime || result.entry[key].endDate.time.replaceAll(':','') > latestTime.replaceAll(':','')) {
                latestTime = result.entry[key].endDate.time;
            }
        }
        if ((result.day == this.eventInfo.endDate.date.replaceAll('-','')) &&
            (latestTime.replaceAll(':','') >
             this.eventInfo.endDate.time.replaceAll(':',''))) {
            this.eventInfo.endDate.time = latestTime;
        }

        this.timetableDrawer.redraw();
    },

    _updateMovedEntry: function(result, oldEntryId) {
        this._updateEntry(result, oldEntryId, function(data){
            if (exists(result.slotEntry)) {
                // move into a session slot
                data[result.day][result.slotEntry.id].entries[result.id] = result.entry;
                // updates the time of the session if it has to be extended
                data[result.day][result.slotEntry.id].startDate.time = result.slotEntry.startDate.time;
                data[result.day][result.slotEntry.id].endDate.time = result.slotEntry.endDate.time;
            } else {
                data[result.day][result.id] = result.entry;
            }
        });
    },

    _updateSessionData: function(sessionId, fields, newValues) {

        var data = this.getData();

        for (day in data) {
            for (entry in data[day]) {
                if ( data[day][entry]["entryType"] == "Session" && data[day][entry]["sessionId"] == sessionId ) {
                    for (i = 0 ; i < fields.length ; ++i) {
                        data[day][entry][fields[i]] = newValues[i];
                    }
                }
            }
        }

        this.timetableDrawer.redraw();
    },

    _getInfoBoxContent: function() {
        return '';
    },

    getTTMenu: function() {

        this.separator2.dom.style.display = "none";
        this.fitInnerTimetableLink.dom.style.display = "none";
        if (this.isSessionTimetable) {
            this.addMenuLink.dom.style.display = "none";
            this.addIntervalLink.dom.style.display = "inline";
            this.rescheduleLink.dom.style.display = "none";
            this.separator.dom.style.display = "none";
        } else {
            this.addIntervalLink.dom.style.display = "none";
        }

        return '';
    },

    _retrieveHistoryState: function(hash) {
        var dayInterval = this._parseDayInterval(hash);

        var currentDay =  dayInterval[0] || keys(this.data)[0];
        if (dayInterval[1]) {
            this.setSelectedTab(dayInterval[0]);
            this.switchToInterval(dayInterval[1]);
        } else {
            this.switchToTopLevel();
            this.setSelectedTab(dayInterval[0]);
        }
    }
},
     function(data, eventInfo, width, wrappingElement, detailLevel, historyBroker, isSessionTimetable, customLinks) {

         this.isSessionTimetable = isSessionTimetable;

         this.ManagementTimeTable(data, eventInfo, eventInfo, width, wrappingElement, detailLevel, customLinks);
         var managementActions = new TopLevelTimeTableManagementActions(this, eventInfo, eventInfo, isSessionTimetable);
         this.TopLevelTimeTableMixin(data, width, wrappingElement, detailLevel, managementActions, historyBroker);

         this.postDraw = TopLevelTimeTableMixin.prototype.postDraw;

     });


type("IntervalManagementTimeTable", ["ManagementTimeTable", "IntervalTimeTableMixin"], {

    _updateTimes: function(newStartTime, newEndTime) {
        this.slotStartTime.set(newStartTime.slice(0,5));
        this.slotEndTime.set(newEndTime.slice(0,5));
    },

    _updateEntry: function(result, oldEntryId, updateCycle) {

        var slot = this.contextInfo;
        var data = this.getData();

        // Delete the old entry
        delete this.parentTimetable.data[this.currentDay][slot.id].entries[oldEntryId];

        this._processAutoOps(result);

        // Here's the update cycle
        if (updateCycle) {
            updateCycle(this.parentTimetable.getData());
        } else {

            // If none is defined in the function args,
            // execute the default action
            data[result.id] = result.entry;

            if (result.session) {
                // Account for "collateral damage" on sessions
                this.parentTimetable.eventInfo.sessions[result.session.id] = result.session;
            }

            if (exists(result.slotEntry)) {

                // Save the entries, otherwise they are lost
                result.slotEntry.entries = slot.entries;
                this.parentTimetable.data[result.day][result.slotEntry.id] = result.slotEntry;
                this.contextInfo = result.slotEntry;
            }
            this.parentTimetable.data[result.day][slot.id].entries[result.entry.id] = result.entry;

            // Update the times for the slot
            this._updateTimes(result.slotEntry.startDate.time,
                              result.slotEntry.endDate.time);

        }

        this.timetableDrawer.redraw();

    },

    _updateMovedEntry: function(result, oldEntryId) {
        this._updateEntry(result, oldEntryId, function(data){
            if(exists(result.slotEntry)){
                // from slot to slot
                data[result.day][result.slotEntry.id].entries[result.id] = result.entry;
                // updates the time of the session if it has to be extended
                data[result.day][result.slotEntry.id].startDate.time = result.slotEntry.startDate.time;
                data[result.day][result.slotEntry.id].endDate.time = result.slotEntry.endDate.time;
            } else {
                // from slot to top level
                data[result.day][result.id]=result.entry;
            }
        });
    },

    /**
     * updateDay should be used when all the entries for a given slot will be changed by the
     * info received in 'result'.
     *
     * result must contain:
     *
     *     result.id: string with a given day, e.g. "20100828"
     *     result.entry: all entries for a given slot
     *     result.slotEntry: info about the slot
     *     result.session: info about the session
     *
     */
    _updateDay: function(result) {

        this._processAutoOps(result);

        var slot = this.contextInfo;
        var day = result.id;
        var data = this.getData();

        extend(data, result.entry);

        if (exists(result.session)) {
            this.parentTimetable.eventInfo.sessions[result.session.id] = result.session;
        }

        if (exists(result.slotEntry)) {

            // Save the entries, otherwise they are lost
            result.slotEntry.entries = slot.entries;
            this.parentTimetable.data[result.day][result.slotEntry.id] = result.slotEntry;
            this.contextInfo = result.slotEntry;

            // Update the times for the slot
            this._updateTimes(result.slotEntry.startDate.time,
                              result.slotEntry.endDate.time);
        }

        this.timetableDrawer.redraw();
    },

    getTTMenu: function() {
        var self = this;

        if (this.isSessionTimetable) {
            this.addMenuLink.dom.style.display = "inline";
            this.addIntervalLink.dom.style.display = "none";
            this.separator2.dom.style.display = "none";
            this.fitInnerTimetableLink.dom.style.display = "none";
            this.rescheduleLink.dom.style.display = "none";
            this.separator.dom.style.display = "inline";
        } else {
            this.addIntervalLink.dom.style.display = "none";
        }

        var goBackLink = Html.span({}, Html.a({className: 'fakeLink', style: {fontWeight: 'bold', margin: '0 15px'}}, 'Go back to timetable'), ' | ');
        goBackLink.observeClick(function() {
            self.parentTimetable.switchToTopLevel();
            self._hideWarnings();
            self.session = null;

        });

        return goBackLink;

    }

},
     function(parent, data, contextInfo, eventInfo, width, wrappingElement, detailLevel, isSessionTimetable, customLinks) {

         this.ManagementTimeTable(data, contextInfo, eventInfo, width, wrappingElement, detailLevel, customLinks);
         var managementActions = new IntervalTimeTableManagementActions(this, eventInfo, contextInfo, isSessionTimetable);
         this.IntervalTimeTableMixin(parent, width, wrappingElement, managementActions);

         this.canvas = Html.div({});
         this.isPoster = contextInfo.isPoster;

         this.setData = IntervalTimeTableMixin.prototype.setData;
         this.getById = IntervalTimeTableMixin.prototype.getById;

     });

type("SessionManagementTimeTable", ["TopLevelManagementTimeTable"], {

},
     function(data, eventInfo, width, wrappingElement, historyBroker) {

         this.TopLevelManagementTimeTable(data, eventInfo, width, wrappingElement, 'session', historyBroker, true);
     });

type("SessionDisplayTimeTable", ["TopLevelDisplayTimeTable"], {

    _functionButtons: function() {
        var self = this;

        this.TopLevelDisplayTimeTable.prototype._functionButtons.call(this);

        return [this.printButton,
                this.fullScreenButton,
                this.filterButton];
    }
},
    function(data, eventInfo, width, wrappingElement, historyBroker) {

        this.TopLevelDisplayTimeTable(data, eventInfo, width, wrappingElement, 'contribution', historyBroker, null);

    });
