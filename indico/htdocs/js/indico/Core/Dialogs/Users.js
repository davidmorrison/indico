function userListNothing(data, func) {
    each(data, function() {
        func(true);
    });
}

function singleUserNothing(user, func) {
    func(true);
}

function arrayToSet(array) {
    var set = {};
    each(array, function(item){
        set[item] = true;
    });
    return set;
}

function userSort(user1, user2) {
    if (user1.familyName > user2.familyName) {
        return 1;
    } else if (user1.familyName == user2.familyName) {
        if (user1.firstName > user2.firstName) {
            return 1;
        } else if (user1.firstName == user2.firstName) {
            return 0;
        } else {
            return -1;
        }
    } else {
        return -1;
    }
}

function updateFavList(favouriteList) {
    IndicoGlobalVars['favorite-user-ids'] = {};
    IndicoGlobalVars['favorite-user-list'] = [];
    each(favouriteList, function(user) {
        IndicoGlobalVars['favorite-user-ids'][user.id] = true;
        IndicoGlobalVars['favorite-user-list'].push(user);
    });
}

/**
 * @param {String} style The class name of the <ul> element inside this FoundPeopleList
 *                       If left to null, it will be "UIPeopleList"
 *
 * @param {Function} selectionObserver A function that will be called when the selection varies. The function will be called without arguments
 *                                     (it can use public methods of FoundPeopleList to get information).
 *
 * @param {Boolean} onlyOne If true, only 1 item can be selected at a time.
 */
type ("FoundPeopleList", ["SelectableListWidget"], {

    _drawItem: function(pair) {
        var self = this;
        var peopleData = pair.get();

        if (peopleData.get('isGroup') || peopleData.get('_type') === 'group') {
            return Html.span({}, peopleData.get("name"));
        } else {

            var userName = Html.span({}, peopleData.get("familyName").toUpperCase(), ', ', peopleData.get("firstName"));
            var userEmail = Html.span({id: self.id + "_" + pair.key + "_email", className: "foundUserEmail"}, Html.br(), Util.truncate(peopleData.get("email"), 40));

            if (this.showToggleFavouriteButtons && IndicoGlobalVars.isUserAuthenticated && peopleData.get('_type') == "Avatar") {
                var favouritizeButton = new ToggleFavouriteButton(peopleData.getAll(), null, null, this.favouriteButtonObserver).draw();
                var favouritizeButtonDiv = Html.div({style: {cssFloat: "right", paddingRight: pixels(10), paddingLeft: pixels(5), paddingTop: pixels(5)}}, favouritizeButton);
                return [favouritizeButtonDiv, userName, userEmail];
            } else {
                return [userName, userEmail];
            }

        }
    }
},

    /**
     * Constructor for FoundPeopleList
     */
    function(style, onlyOne, selectionObserver, showToggleFavouriteButtons, favouriteButtonObserver) {

        if (!exists(style)) {
            style = "UIPeopleList";
        }

        this.onlyOne = any(onlyOne,false);
        this.showToggleFavouriteButtons = any(showToggleFavouriteButtons, true);
        this.favouriteButtonObserver = any(favouriteButtonObserver, null);

        /*this.lastTargetListItem = null;*/

        this.SelectableListWidget(selectionObserver, this.onlyOne, style, "selectedUser", "unselectedUser"); //, this.__mouseoverObserver);
    }
);


/**
 * Base class for UserSearchPanel and GroupSearchPanel
 * @param {Boolean} onlyOne If true, only 1 item can be selected at a time.
 * @param {function} selectionObserver Function that will be called when the selected users xor groups change.
 *                                     Will be passed to the inner FoundPeopleList.
 */
type ("SimpleSearchPanel", ["IWidget"], {

   /**
    * Simulates a click in the search button
    */
   _searchAction: function() {
       Dom.Event.dispatch(this.searchButton.dom, 'click');
   },

   /**
    * Form to fill in group search data
    */
   _createSearchForm: function() {
       // To be overloaded by implementing classes
   },

   /**
    * Function to be executed when the search button is pressed
    */
   _search: function() {
       // To be overloaded by implementing classes
   },

   /**
    * Returns the part of the form corresponding to search including external authenticators
    * Should be called by the implementing classes' _createSearchForm method.
    */
   _createAuthenticatorSearch: function() {
       var self = this;

       if (empty(Indico.Settings.ExtAuthenticators)) {
           return null;
       } else {
           var authenticatorList = [];
           each(Indico.Settings.ExtAuthenticators, function(auth) {
               var searchExternalCB = Html.checkbox({});
               $B(searchExternalCB, self.criteria.accessor('searchExternal-' + auth[0]));
               authenticatorList.push(["Search " + auth[1], searchExternalCB]);
           });
           return authenticatorList;
       }
   },

   /**
    * Returns the list of selected users xor groups for this panel
    */
   getSelectedList: function() {
       return this.foundPeopleList.getSelectedList();
   },

   /**
    * Clears the selection
    */
   clearSelection: function() {
       this.foundPeopleList.clearSelection();
   },

   /**
    * Returns the Panel's DOM
    */
   draw: function() {
       var self = this;

       this.searchForm = this._createSearchForm();

       this.searchButton = Html.input("button", {}, $T("Search"));
       this.searchButtonDiv = Html.div("searchUsersButtonDiv",this.searchButton);
       this.searchButton.observeClick(function(){
           self._search();
       });

       this.foundPeopleListDiv = Html.div("UISearchPeopleListDiv", this.foundPeopleList.draw());

       this.container = Html.div({}, this.searchForm, this.searchButtonDiv, this.foundPeopleListDiv);

       return this.IWidget.prototype.draw.call(this, this.container);
   }
},

    /**
     * Constructor for SimpleSearchPanel
     */
    function(onlyOne, selectionObserver, showToggleFavouriteButtons, favouriteButtonObserver) {

        this.IWidget();
        this.onlyOne = any(onlyOne, false);

        this.criteria = new WatchObject();

        this.foundPeopleList = new FoundPeopleList(null, this.onlyOne, selectionObserver, showToggleFavouriteButtons, favouriteButtonObserver);
        this.foundPeopleList.setMessage("Fill any of the upper fields and click search...");

        this.searchForm = null;
        this.searchButton = null;
        this.searchButtonDiv = null;
        this.foundPeopleListDiv = null;
        this.container = null;
   }
);


/**
 * Panel to search for users.
 * @param {Boolean} onlyOne If true, only 1 item can be selected at a time.
 * @param {function} selectionObserver Function that will be called when the selected users xor groups change.
 *                                     Will be passed to the inner FoundPeopleList.
 */
type ("UserSearchPanel", ["SimpleSearchPanel"], {

    /**
     * Form to fill in user search data
     */
    _createSearchForm: function() {
        var self = this;

        var familyName = new EnterObserverTextBox("text",{style:{width:"100%"},id:'userSearchFocusField'}, function() {
            self._searchAction();
            return false;
        });

        var firstName = new EnterObserverTextBox("text",{style:{width:"100%"}}, function() {
            self._searchAction();
            return false;
        });

        var email = new EnterObserverTextBox("text",{style:{width:"100%"}}, function() {
            self._searchAction();
            return false;
        });

        var organisation = new EnterObserverTextBox("text",{style:{width:"100%"}}, function() {
            self._searchAction();
            return false;
        });

        var exactMatch = Html.checkbox({});

        $B(familyName, this.criteria.accessor('surName'));
        $B(firstName, this.criteria.accessor('name'));
        $B(organisation, this.criteria.accessor('organisation'));
        $B(email, this.criteria.accessor('email'));
        $B(exactMatch, this.criteria.accessor('exactMatch'));

        var fieldList = [[$T("Family name"), familyName.draw()],
                         [$T("First name"), firstName.draw()],
                         [$T("E-mail"), email.draw()],
                         [$T("Organisation"), organisation.draw()],
                         [$T("Exact Match"), exactMatch]];

        var authenticatorSearch = this._createAuthenticatorSearch();
        if (exists(authenticatorSearch)) {
            fieldList = concat(fieldList, authenticatorSearch);
        }

        return IndicoUtil.createFormFromMap(fieldList, true);
    },

    /**
     * Function that is called when the Search button is pressed.
     */
    _search: function() {
        var self = this;

        self.searchButton.dom.disabled = true;
        this.foundPeopleList.setMessage(Html.div({style: {paddingTop: '20px'}}, progressIndicator(false, true)));

        indicoRequest(
            'search.users',
            self.criteria,
            function(result,error) {
                if (!error) {
                    self.foundPeopleList.clearList();
                    if (result.length === 0) {
                        self.foundPeopleList.setMessage($T("No results for this search..."));
                    } else {
                        each(result, function(user){
                            if (user._type === "Avatar") {
                                self.foundPeopleList.set('existingAv' + user.id, $O(user));
                            } else if (user._type === "ContributionParticipation") {
                                self.foundPeopleList.set('existingAuthor' + user.id, $O(user));
                            }
                        });
                    }
                    self.searchButton.dom.disabled = false;
                } else {
                    self.foundPeopleList.clearList();
                    IndicoUtil.errorReport(error);
                }
            }
        );
    },

    /**
     * Returns the panel's DOM
     */
    draw: function() {
        return this.SimpleSearchPanel.prototype.draw.call(this);
    }
},

    /**
     * Constructor for UserSearchPanel
     */
    function(onlyOne, selectionObserver, conferenceId, showToggleFavouriteButtons, favouriteButtonObserver){
        this.SimpleSearchPanel(onlyOne, selectionObserver, showToggleFavouriteButtons, favouriteButtonObserver);
        if(exists(conferenceId)) {
            this.criteria.set("conferenceId", conferenceId);
        }
    }
);


/**
 * Panel to search for groups.
 * @param {Boolean} onlyOne If true, only 1 item can be selected at a time.
 * @param {function} selectionObserver Function that will be called when the selected users xor groups change.
 *                                     Will be passed to the inner FoundPeopleList.
 */
type ("GroupSearchPanel", ["SimpleSearchPanel"], {

    /**
     * Form to fill in group search data
     */
    _createSearchForm: function() {

        var self = this;

        var groupName = new EnterObserverTextBox("text",{style:{width:"100%"}}, function() {
            self._searchAction();
            return false;
        });

        $B(groupName, this.criteria.accessor('group'));

        var fieldList = [[$T("Group name"), groupName.draw()]];

        var authenticatorSearch = this._createAuthenticatorSearch();
        if (exists(authenticatorSearch)) {
            fieldList = concat(fieldList, authenticatorSearch);
        }

        return IndicoUtil.createFormFromMap(fieldList, true);
    },

    /**
     * Function that is called when the Search button is pressed.
     */
    _search: function() {
        var self = this;

        self.searchButton.dom.disabled = true;
        this.foundPeopleList.setMessage(Html.div({style: {paddingTop: '20px'}}, progressIndicator(false, true)));

        indicoRequest(
            'search.groups',
            self.criteria,
            function(result,error) {
                if (!error) {
                    self.foundPeopleList.clearList();
                    if (result.length === 0) {
                        self.foundPeopleList.setMessage($T("No results for this search..."));
                    } else {
                        each(result, function(group){
                            self.foundPeopleList.set(group.name, $O(group));
                        });
                    }
                    self.searchButton.dom.disabled = false;
                } else {
                    self.foundPeopleList.clearList();
                    IndicoUtil.errorReport(error);
                }
            }
        );
    },

    /**
     * Returns the panel's DOM
     */
    draw: function() {
        return this.SimpleSearchPanel.prototype.draw.call(this);
    }
},

    /**
     * Constructor for GroupSearchPanel
     */
    function(onlyOne, selectionObserver, conferenceId, showToggleFavouriteButtons){
        this.SimpleSearchPanel(onlyOne, selectionObserver, conferenceId, showToggleFavouriteButtons);
    }
);


/**
 * Tabbed panel to search either for users or groups
 * @param {Boolean} onlyOne If true, only 1 item can be selected at a time.
 * @param {function} selectionObserver Function that will be called when the selected users xor groups change.
 *                                     Will be passed to the inner FoundPeopleList.
 */
type ("UserAndGroupsSearchPanel", ["IWidget"], {

    /**
     * Function that will be called when the selection changes in either of the panel
     * @param {String} panel 'users' or 'groups', to know which panel's selection changed
     * @param {WatchObject} selectedList a list of selected users.
     */
    __selectionObserver: function(panel, selectedList) {

        if (this.onlyOne) {
            if (panel === "users") {
                this.groupPanel.clearSelection();
            } else {
                this.userPanel.clearSelection();
            }
            this.parentSelectionObserver(selectedList);
        } else {
            var totalSelection = $O();
            totalSelection.update(this.userPanel.getSelectedList().getAll());
            totalSelection.update(this.groupPanel.getSelectedList().getAll());
            this.parentSelectionObserver(totalSelection);
        }
    },

    /**
     * Returns the list of selected users / groups in both panels
     * @return {WatchObject} The list of selected users. Key = user / group id, value = user data
     */
    getSelectedList: function() {
        var totalSelection = $O();

        totalSelection.update(this.userPanel.getSelectedList().getAll());
        totalSelection.update(this.groupPanel.getSelectedList().getAll());

        return totalSelection;
    },

    /**
     * Clears the selection in both panels
     */
    clearSelection: function() {
        this.userPanel.clearSelection();
        this.groupPanel.clearSelection();
    },

    /**
     * Returns the panel's DOM
     */
    draw: function() {
        var self = this;

        this.tabWidget = new TabWidget([[$T("Users"), this.userPanel.draw()], [$T("Groups"), this.groupPanel.draw()]], null, null);

        return this.IWidget.prototype.draw.call(this, this.tabWidget.draw());
    }
},

    /**
     * Constructor for UserAndGroupsSearchPanel
     */
    function(onlyOne, selectionObserver, conferenceId, showToggleFavouriteButtons, favouriteButtonObserver){
        this.IWidget();
        this.onlyOne = any(onlyOne, false);
        this.parentSelectionObserver = selectionObserver;

        var self = this;

        this.userPanel = new UserSearchPanel(this.onlyOne, function(selectedList){
            self.__selectionObserver("users", selectedList);
        }, conferenceId, showToggleFavouriteButtons, favouriteButtonObserver);
        this.groupPanel = new GroupSearchPanel(this.onlyOne, function(selectedList){
            self.__selectionObserver("groups", selectedList);
        }, showToggleFavouriteButtons);

        this.tabWidget = null;
    }
);


/**
 * Panel with a list of suggested users.
 * @param {Boolean} onlyOne If true, only 1 item can be selected at a time.
 * @param {Boolean} includeFavourites If True, favourites will appear in the list of suggested users of the ChooseUsersPopup.
 * @param {WatchObject} suggestedUsers A list of users that will be used as list of suggested users.
 *                                     This argument has to be an array or WatchList where the keys are the user ids and the values are fossils/dictionaries with the user data.
 *                                     If null, there will be no suggestedUsers panel.
 * @param {function} selectionObserver Function that will be called when the selected users xor groups change.
 *                                     Will be passed to the inner FoundPeopleList.
 */
type ("SuggestedUsersPanel", ["IWidget"], {

    getSelectedList: function() {
        return this.suggestedUserList.getSelectedList();
    },

    clearSelection: function() {
        this.suggestedUserList.clearSelection();
    },

    draw: function() {
        var self = this;

        this.titleDiv = Html.div("suggestedUsersTitle", Html.span({},$T("Suggested users")));

        if (this.suggestedUserList.isEmpty()) {
            var message = Html.span({}, $T("There are no suggested users for you at the moment. Why not add some "),
                                        Html.a({href: Indico.Urls.Favourites}, $T("favourites")),
                                        "?");
            this.suggestedUserList.setMessage(message);
        }

        this.suggestedUserListDiv = Html.div("UISuggestedPeopleListDiv", this.suggestedUserList.draw());

        return this.IWidget.prototype.draw.call(this, Widget.block([this.titleDiv, this.suggestedUserListDiv]));
    }
},

    /**
     * Constructor for SuggestedUsersPanel
     */
    function(onlyOne, includeFavourites, suggestedUsers, selectionObserver, showToggleFavouriteButtons){
        this.IWidget();

        this.onlyOne = any(onlyOne, false);

        includeFavourites = any(includeFavourites, true);

        this.suggestedUserList = new FoundPeopleList(null, this.onlyOne, selectionObserver, showToggleFavouriteButtons);

        var self = this;

        if (exists(suggestedUsers)) {
            each(suggestedUsers, function(user){
                if (any(user._type, null) === "Avatar") {
                    self.suggestedUserList.set('existingAv' + user.id, $O(user));
                } else {
                    self.suggestedUserList.set(user.id, $O(user));
                }
            });
        }

        if (includeFavourites) {
            each(IndicoGlobalVars['favorite-user-list'], function(user){
                var id = user.id;
                if (exists(IndicoGlobalVars['favorite-user-ids'][id]) && IndicoGlobalVars['favorite-user-ids'][id] && !self.suggestedUserList.get('existingAv' + id)) {
                    self.suggestedUserList.set('existingAv' + id, $O(user));
                }
            });
        }

        this.titleDiv = null;
        this.suggestedUserListDiv = null;
    }
);


/**
 * Creates a popup to add users in different ways (search in DB, choose from favourites, add a new one...).
 *
 * @param {String} title The dialog title
 *
 * @param {Boolean} allowSearch If this is true, a search user panel will appear.
 * @param {Integer} conferenceId If allowSearch is true, and if this is different from null, authors from that conference will be included in the search results.
 * @param {Boolean} enableGroups If allowSearch is true, and if this is true, groups will be available for search and add.
 *
 * @param {Boolean} includeFavourites If True, favourites will appear in the list of suggested users of the ChooseUsersPopup.
 * @param {WatchObject} suggestedUsers An array or WatchList of users that will be used as list of suggested users. The users
 *                                     should be fossils / dictionaries with the user data.
 *                                     If null, there will be no suggestedUsers panel.
 *
 * @param {Boolean} onlyOne If true, only 1 user will be able to be chosen in the dialog..
 *
 * @param {Function} process A function that will be called when new users (from new data, or from the search dialog, or from the suggested list) is added to the list.
 *                           The function will be passed a list of WatchObjects representing the users, even when onlyOne is true.
 */
type("ChooseUsersPopup", ["ExclusivePopupWithButtons", "PreLoadHandler"], {

    _preload: [

        function(hook) {
            var self = this;

            if (exists(IndicoGlobalVars['favorite-user-list'])) {
                hook.set(true);
            } else {
                var killProgress = IndicoUI.Dialogs.Util.progress($T("Loading dialog..."));
                indicoRequest('user.favorites.listUsers', {},
                    function(result, error) {
                        if (!error) {
                            updateFavList(result);
                            killProgress();
                            hook.set(true);
                        } else {
                            killProgress();
                            IndicoUI.Dialogs.Util.error(error);
                        }
                    }
                );
            }
        }
    ],

    __buildSearchPanel: function(container) {
        var self = this;

        if (this.enableGroups) {
            this.searchPanel = new UserAndGroupsSearchPanel(this.onlyOne, function(selectedList){
                self.__selectionObserver("searchUsers", selectedList);
            }, this.conferenceId, this.showToggleFavouriteButtons, function(avatar, action) {
                self.__searchPanelFavouriteButtonObserver(avatar, action);
            });
            var returnedDom = this.searchPanel.draw();
            container.append(returnedDom);
            container.setStyle("paddingTop", pixels(0));
        } else {
            this.searchPanel = new UserSearchPanel(this.onlyOne, function(selectedList){
                self.__selectionObserver("searchUsers", selectedList);
            }, this.conferenceId, this.showToggleFavouriteButtons, function(avatar, action) {
                self.__searchPanelFavouriteButtonObserver(avatar, action);
            });
            var returnedDom = this.searchPanel.draw();
            container.append(returnedDom);
        }


    },

    __buildSuggestedUsersPanel: function(container) {
        var self = this;

        this.suggestedUsersPanel = new SuggestedUsersPanel(this.onlyOne, this.includeFavourites, this.suggestedUsers, function(selectedList){
            self.__selectionObserver("suggestedUsers", selectedList);
        }, this.showToggleFavouriteButtons);

        container.append(this.suggestedUsersPanel.draw());
    },

    __selectionObserver: function(panel, selectedList) {

        if (this.onlyOne) {
            if (panel === "searchUsers") {
                this.suggestedUsersPanel.clearSelection();
            } else {
                this.searchPanel.clearSelection();
            }
            if (selectedList.isEmpty()) {
                this.saveButton.disable();
            } else {
                this.saveButton.enable();
            }

        } else {

            if (!selectedList.isEmpty()) {
                this.saveButton.enable();
            } else {
                var twoPanels = this.allowSearch && (this.includeFavourites || exists(this.suggestedUsers));
                if (twoPanels) {
                    var otherSelectedList = (panel === "searchUsers") ? this.suggestedUsersPanel.getSelection() : this.searchPanel.getSelection();
                    if (otherSelectedList.isEmpty()) {
                        this.saveButton.disable();
                    } else {
                        this.saveButton.enable();
                    }
                } else {
                    this.saveButton.disable();
                }
            }
        }
    },

    __save: function() {
        var totalSelected = $O({});
        if (this.allowSearch) {
            totalSelected.update(this.searchPanel.getSelectedList().getAll());
        }
        if (this.includeFavourites || exists(this.suggestedUsers)) {
            totalSelected.update(this.suggestedUsersPanel.getSelectedList().getAll());
        }

        var returnedList = new List();
        each(totalSelected, function(selectedItem) {
            returnedList.append(selectedItem.getAll());
        });
        this.chooseProcess(returnedList.allItems());
    },

    __searchPanelFavouriteButtonObserver: function(avatar, addedOrRemoved) {
        if (addedOrRemoved) {
            this.suggestedUsersPanel.suggestedUserList.set('existingAv' + avatar.id, $O(avatar));
        }
    },

    /**
     * Returns the dialog's DOM
     */
    draw: function() {

        var self = this;

        // We construct the "save" button and what happens when it's pressed
        self.saveButton = new DisabledButton(Html.input("button", {disabled:true}, self.onlyOne? $T("Choose") : $T("Add") ));
        var saveButtonTooltip;
        self.saveButton.observeEvent('mouseover', function(event){
            if (!self.saveButton.isEnabled()) {
                saveButtonTooltip = IndicoUI.Widgets.Generic.errorTooltip(event.clientX, event.clientY, $T("Please select at least one item"), "tooltipError");
            }
        });
        self.saveButton.observeEvent('mouseout', function(event){
            Dom.List.remove(document.body, saveButtonTooltip);
        });

        self.saveButton.observeClick(function(){
            self.__save();
            self.close();
        });

        // We construct the "cancel" button and what happens when it's pressed (which is: just close the dialog)
        var cancelButton = Html.input("button", {style:{marginLeft:pixels(5)}}, "Cancel");
        cancelButton.observeClick(function(){
            self.close();
        });

        var mainContent = Html.tr();

        if (self.allowSearch) {
            this.cellSearch = Html.td("searchUsersGroupsPanel");
            self.__buildSearchPanel(this.cellSearch);
            mainContent.append(this.cellSearch);
        }

        if (this.includeFavourites || exists(this.suggestedUsers)) {
            this.cellSuggested = Html.td("suggestedUsersPanel");
            self.__buildSuggestedUsersPanel(this.cellSuggested);
            mainContent.append(this.cellSuggested);
        }

        mainContent = Html.table({cellpadding: 0, cellPadding: 0, cellspacing: 0, cellSpacing: 0}, Html.tbody({}, mainContent));

        this.buttonDiv = Html.div({}, self.saveButton.draw(), cancelButton);

        return this.ExclusivePopupWithButtons.prototype.draw.call(this, mainContent, this.buttonDiv, {}, {padding:pixels(0)});

    },

    postDraw: function() {
        // We have to do this first and not after the super call or it won't work in IE7
        if (this.allowSearch && this.enableGroups) {
            var tabContainer = this.searchPanel.tabWidget.container;
            tabContainer.setStyle('height', pixels(tabContainer.dom.offsetHeight));
        }
        if (this.includeFavourites || exists(this.suggestedUsers)) {
            this.suggestedUsersPanel.suggestedUserListDiv.setStyle('height', pixels(this.cellSuggested.dom.offsetHeight - this.suggestedUsersPanel.titleDiv.dom.offsetHeight - 10));
        }
        this.ExclusivePopupWithButtons.prototype.postDraw.call(this);
        $E('userSearchFocusField').dom.focus();
    }
},
    /**
     * Constructor for ChooseUsersPopup
     */
    function(title,
             allowSearch,
             conferenceId, enableGroups,
             includeFavourites, suggestedUsers,
             onlyOne, showToggleFavouriteButtons,
             chooseProcess) {

        var self = this;

        this.allowSearch = allowSearch;
        this.conferenceId = conferenceId;
        this.enableGroups = enableGroups;

        this.includeFavourites = any(includeFavourites, true);
        this.suggestedUsers = suggestedUsers;

        this.onlyOne = any(onlyOne, false);
        this.showToggleFavouriteButtons = any(showToggleFavouriteButtons, true);
        this.chooseProcess = chooseProcess;

        // Other attributes that will be set in other methods, listed here for reference
        this.saveButton = null;
        this.suggestedUsersPanel = null;
        this.searchPanel = null;
        this.buttonDiv = null;
        this.cellSearch = null;
        this.cellSuggested = null;

        // We build the dialog.
        this.PreLoadHandler(
            self._preload,
            function() {
                self.open();
            });
        this.ExclusivePopupWithButtons(title, positive);
    }
);



/**
 * Creates a form field whose value is a single user
 *
 * @param {Object} initialUser A user that will appear initially. Example: ${ AvatarHolder().getById(1).fossilize(IAvatarFossil) }
 *
 * @param {String} hiddenFieldName The name attribute for the hidden field that will be drawn along with the rest of the widget.
 *                                 This hidden field will have the currently selected user's id.
 *                                 If left to null, there will be no hidden field.
 *
 * @param {Boolean} allowChoose If true, a 'Choose User' dialog will be present when pressing on the "choose" button.
 *
 * @param {Boolean} includeFavourites If True, favourites will appear in the list of suggested users of the ChooseUsersPopup.
 * @param {list} suggestedUsers A list of users that will be offered as options to be added. Example: ${ jsonEncode(fossilize([AvatarHolder().getById(3), AvatarHolder().getById(4)], IAvatarFossil)) }
 *                              If left to null, there will be suggested Users. For an empty list of users, use {}
 *
 * @param {Integer} conferenceId If different from null, authors from that conference will be included in the search results.
 * @param {Boolean} enableGroups If true, choosing groups will be enabled.
 *
 * @param {Boolean} allowNew If true, a 'New User' button will be present.
 *
 * @param {Boolean} allowDelete If true, the user will be able to be deleted from the field.
 *
 * @param {Function} assignProcess A function that will be called when a new user is chosen (from new data, or from the search dialog, or from the suggested list).
 *                                 The function will be passed a WatchObject representing the user, and a callback function.
 *                                 The callback function has to be called with "true" as argument to effectively display the new user.
 * @param {Function} removeProcess A function that will be called when a user is removed.
 *                                 The function will be passed a WatchObject representing the user, and a callback function.
 *                                 The callback function has to be called with "true" as argument to effectively display the new user.
 */
type("SingleUserField", ["IWidget"], {

    /**
     * @return {String} The id of the currently selected user
     */
    get: function() {
        return this.user.getAll();
    },

    set: function(user) {
        this.user.replace(user);
        this.__userChosenObserver();
    },

    /**
     * @return {String} the name of the inner hidden field
     */
    getName: function() {
        return this.hiddenFieldName;
    },

    /**
     * @return {Boolean} Returns if a user has been chosen or not
     */
    isUserChosen: function() {
        return this.userChosen.get();
    },

    __getNotChosenUser: function() {
        return {id: null, name: "Choose a user"};
    },

    /**
     * Updates the buttons to be shown next to the user name after the user changes
     * @param {Object} user a dictionary with the user info.
     */
    __userChosenObserver: function() {
        user = this.user.getAll();

        this.variableButtonsDiv.clear();
        if (IndicoGlobalVars.isUserAuthenticated && this.userChosen && user._type === "Avatar") {
            var favButtonDiv = Html.div({style:{display:"inline", paddingLeft:pixels(5)}}, new ToggleFavouriteButton(user).draw());
            this.variableButtonsDiv.append(favButtonDiv);
        }

        if (this.allowDelete && this.userChosen) {

            var removeButton = Widget.link(command(function(){
                self.userChosen.set(false);
                var notChosenUser = self.__getNotChosenUser();
                self.user.replace(notChosenUser);
                self.__userChosenObserver();
            }, IndicoUI.Buttons.removeButton()));

            var removeButtonDiv = Html.div({style:{display:"inline"}}, removeButton);
            this.variableButtonsDiv.append(removeButtonDiv);
        }
    },

    /**
     * Returns the DOM of the widget
     */
    draw: function() {
        var self = this;

        var contentDiv = Html.div({style:{display:"inline"}});

        // Draw the hidden field
        if (exists(this.hiddenFieldName)) {
            contentDiv.append($B(Html.input('hidden'), {name: this.hiddenFieldName}, self.user.accessor('id')));
        }

        // Draw the user if there is one
        var userNameDiv = $B(Html.span({style:{verticalAlign:'middle'}}), self.user.accessor('name'));
        contentDiv.append(userNameDiv);

        this.variableButtonsDiv = Html.div({style: {display: 'inline'}});
        this.__userChosenObserver();

        var fixedButtonsDiv = Html.div({style: {display: 'inline'}});
        // Draw the choose button
        if (self.allowChoose) {
            var chooseButton = Html.input("button", {style:{marginLeft: pixels(10), verticalAlign:'middle'}}, $T('Choose'));

            var chooseUserHandler = function(userList) {
                self.assignProcess(userList, function(value) {
                    if (value) { // the assignProcess function returned true
                        var returnedUser = userList[0];
                        self.user.replace(returnedUser);
                        self.__userChosenObserver();
                        self.userChosen.set(true);
                    }
                });
            };

            chooseButton.observeClick(function(){
                var userChoosePopup = new ChooseUsersPopup("Choose user",
                                                           true, self.conferenceId, self.enableGroups,
                                                           self.includeFavourites, self.suggestedUsers,
                                                           true, true,
                                                           chooseUserHandler);
                userChoosePopup.execute();
            });

            fixedButtonsDiv.append(chooseButton);
        }

        return Html.div({style: {display: 'inline'}},
                        contentDiv,
                        this.variableButtonsDiv,
                        fixedButtonsDiv);
    }
},
    /**
     * Constructor of SingleUserField
     */
    function(initialUser,
             hiddenFieldName,
             allowChoose,
             includeFavourites, suggestedUsers,
             conferenceId, enableGroups,
             allowNew, allowDelete,
             assignProcess, removeProcess) {

        var self = this;

        // we store the selected user
        this.user = $O(exists(initialUser) ? initialUser : this.__getNotChosenUser());
        this.userChosen = new WatchValue(exists(initialUser));

        this.hiddenFieldName = hiddenFieldName;

        this.allowChoose = any(allowChoose, true);

        this.includeFavourites = any(includeFavourites, true);
        if (exists(suggestedUsers)) {
            if (suggestedUsers.WatchList) {
                this.suggestedUsers = suggestedUsers;
            } else {
                this.suggestedUsers = new WatchList();
                each(suggestedUsers, function(user){
                    self.suggestedUsers.append(user);
                });
            }
        } else {
            this.suggestedUsers = null;
        }

        this.conferenceId = any(conferenceId, null);
        this.enableGroups = any(enableGroups, false);

        // new user dialog configuration
        this.allowNew = any(allowNew, false);

        // widget delete and favouritize buttons configuration
        this.allowDelete = any(allowDelete, true);

        // assign and remove user hook functions
        this.assignProcess = any(assignProcess, singleUserNothing);
        this.removeProcess = any(removeProcess, singleUserNothing);

        // div that will have the remove and favouritize buttons
        this.buttonsDiv = Html.div({style:{display:"inline"}});

    }
);

/**
 * Creates a user search pop-up dialog that queries the user
 * database.
 * @param {Function} process Callback method that is invoked
 *                   in order to process the users that are selected
 *                   from the list.
 * @param {Function} suicideHook A callback method that is passed by
 *                   the exclusivePopup method, and is called by the
 *                   function when the dialog needs to be destroyed.
 */
/*
type ("UserSearchPopup", ["ExclusivePopup"], {

    _clickSearchAction: function(){
        Dom.Event.dispatch( this.searchButton.dom, 'click');
    },

    _drawUsers: function() {
        var self = this;
        // Form to input user data
        var criteria = this.criteria;

        var famName = new EnterObserverTextBox("text",{}, function() {
            self._clickSearchAction();
            });
        var firstName = new EnterObserverTextBox("text",{}, function() {
            self._clickSearchAction();
        });
        var email = new EnterObserverTextBox("text",{}, function() {
            self._clickSearchAction();
        });
        var org = new EnterObserverTextBox("text",{}, function() {
            self._clickSearchAction();
        });
        var exactMatch = Html.checkbox({});

        $B(famName, criteria.accessor('surName'));
        $B(firstName, criteria.accessor('name'));
        $B(org, criteria.accessor('organisation'));
        $B(email, criteria.accessor('email'));
        $B(exactMatch, criteria.accessor('exactMatch'));

        return IndicoUtil.createFormFromMap([[$T("Family name"), famName.draw()], [$T("First name"), firstName.draw()], [$T("E-mail"), email.draw()], [$T("Organisation"), org.draw()], [$T("Exact Match"), exactMatch]]);
    },

    _drawGroups: function() {
        var self = this;
        var criteria = this.criteria;

        return IndicoUtil.createFormFromMap([
            ["Group name",
             $B( new EnterObserverTextBox("text",{}, function() {
                 self._clickSearchAction();
             }).draw(), criteria.accessor('group'))]]);
    },

    _clearSelections: function(selectedList, selectedDiv) {
        selectedList.clear();
        each(selectedDiv, function(elem) {
            elem.dom.className = 'unselectedUser';
        });
    },

    draw: function () {

        var selectedUserList = new WatchList();
        var selectedGroupList = new WatchList();

        selectedUserList.length.observe(function(){
            if (selectedUserList.length.get() > 0) {
                addButton.enable();
            }else {
                addButton.disable();
            }
        });

        selectedGroupList.length.observe(function(){
            if (selectedGroupList.length.get() > 0) {
                addButton.enable();
            }else {
                addButton.disable();
            }
        });

        var self = this;

        var selectedDiv;


        //
        // if we want to allow the search in many DB we should do something like this
        //
        //var authList = [];
        //each(Indico.Settings.ExtAuthenticators, function(auth) {
        //        var searchExt = Html.checkbox({});
        //        $B(searchExt, this.criteria.accessor('searchExt'));
        //        authList.append(["Search "+auth, searchExt])
        //});
        //
        var searchExtForm = null;
        if (!empty(Indico.Settings.ExtAuthenticators)){
            var searchExt = Html.checkbox({});
            $B(searchExt, this.criteria.accessor('searchExt'));
            //
            // TODO: TO IMPROVE THIS (related with upper comment).
            // Current search service does not support to search in specific authenticators. But you
            // can search in all of them by activating the flag "searchExt".
            // For CERN, we want to display NICE instead of "Search external authenticator", that's
            // why we use Indico.Settings.ExtAuthenticators[0] because we suppose that there will be
            // just one external authenticator.
            //
            searchExtForm = IndicoUtil.createFormFromMap([["Search "+Indico.Settings.ExtAuthenticators[0], searchExt]]);
        }

        var source = null;
        this.searchButton = Html.input("button", {}, $T("Search"));
        var parametersArea = this.searchGroups?
        this.parametersWidget.draw():this.parametersWidget;

        var formPart = Html.div({}, parametersArea, searchExtForm, Html.div({style:{textAlign:"center"}},this.searchButton));
        this.searchButton.observeClick(function(){
            if (!source) {
                source = indicoSource('search.usersGroups', self.criteria);
                bind.element(peopleList, $L($V(source, "people")), template('user'));
                bind.element(groupList, $L($V(source, "groups")), template('group'));
                source.state.observe(function(state) {
                    if (state == SourceState.Loaded) {
                        userList.set(selectedDiv);
                        self.searchButton.dom.disabled = false;
                        if ( (!self.searchGroups && empty($L($V(source, "people")))) ||
                             (self.searchGroups && self.parametersWidget.selected.get() == 'Users' && empty($L($V(source, "people")))) ||
                            (self.searchGroups && self.parametersWidget.selected.get() == 'Groups' && empty($L($V(source, "groups"))))) {
                            userList.append(Html.br());
                            userList.append(Html.em({style:{padding: pixels(10)}}, $T("No results for this search...") ));
                        }
                    }
                });
            }else {
                source.refresh();
            }
            selectedUserList.clear();
            selectedGroupList.clear();
            userList.set(Html.div({style: {paddingTop: '20px'}}, progressIndicator(false, true)));
            self.searchButton.dom.disabled = true;
        });


        // List of found users
        var template = function(userOrGroup) {
            return function(value){
                var liElem = (value.isGroup || value._fossil === 'group') ? Html.li({}, value.name) :
                Html.li({}, value.familyName.toUpperCase() + ', ' + value.firstName, Html.em({},' (' + value.email + ')'));
                liElem.observeClick(function() {
                    toggle(userOrGroup, value, liElem);
                });
                return liElem;
            };
        };

        var toggle = function(userOrGroup, object, element){
            var selectedList = userOrGroup=='user'?
                selectedUserList:selectedGroupList;

            if (!search(selectedList, match(object))) {
                if (self.onlyOne) {
                    self._clearSelections(selectedList, selectedDiv);
                }
                selectedList.insert(object);
                element.dom.className = 'selectedUser';
            }
            else {
                selectedList.remove(object);
                element.dom.className = 'unselectedUser';
            }
        };

        var peopleList = Html.ul("UIPeopleList");
        var groupList = Html.ul("UIPeopleList");

        var userList = Html.div({className:'UISearchPeopleListDiv'}, peopleList);
        selectedDiv = peopleList;

        var tooltipListEmpty = Html.em({style:{padding: pixels(10)}}, $T("Fill any of the upper fields and click search...") );
        userList.append(Html.br());
        userList.append(tooltipListEmpty);

        if (this.searchGroups) {
            this.parametersWidget.selected.observe(function(option) {
                if (option == 'Users') {
                    selectedDiv = peopleList;
                } else {
                    selectedDiv = groupList;
                }
                userList.set(selectedDiv);
                if (!selectedDiv.get()) {
                    userList.append(Html.br());
                    userList.append(tooltipListEmpty);
                }
            });

            this.parametersWidget.selected.set('Users');
        }

        var addButton = new DisabledButton(Html.input("button", {disabled:true},
                this.onlyOne? $T("Choose") : $T("Add") ));
        var cancelButton = Html.input("button", {style:{marginLeft: pixels(5)}}, $T("Cancel") );
        var buttons = Html.div({ style: {textAlign: 'center'}}, addButton.draw(), cancelButton);

        cancelButton.observeClick(function(){
            self.close();
        });

        var tooltip;

        addButton.observeEvent('mouseover', function(event){
            if (!addButton.isEnabled()) {
                tooltip = IndicoUI.Widgets.Generic.errorTooltip(event.clientX, event.clientY, $T("You must select at least one item from the list"), "tooltipError");
            }
        });

        addButton.observeEvent('mouseout', function(event){
            Dom.List.remove(document.body, tooltip);
        });

        addButton.observeClick(function(){
            var mergedList = concat(
                selectedUserList.allItems(),
                selectedGroupList.allItems()
            );
            self.processFunction(mergedList);
            self.close();
        });

        return this.ExclusivePopup.prototype.draw.call(
            this,
            Html.div({},
                     Widget.block([
                         formPart,
                         userList,
                         buttons
                     ])));
    }

},
      function(title, process, searchGroups, conferenceId, onlyOne) {
          var self = this;

          this.searchGroups = exists(searchGroups)?searchGroups:false;
          this.onlyOne = any(onlyOne, false);

          this.criteria = new WatchObject();

          if (conferenceId) {
              this.criteria.set('conferenceId', conferenceId);
          }

          if (this.searchGroups) {
              this.parametersWidget = new TabWidget(
                  [
                      ["Users", self._drawUsers()],
                      ["Groups", self._drawGroups()]
                  ], "100%", 150, 1);
          } else {
              this.parametersWidget = self._drawUsers();
          }

          this.parametersWidget.options = $L(["Users", "Groups"]);
          this.processFunction = process;
          this.ExclusivePopup(title, function(){return true;});
      }
     );
*/

/**
 * Creates a data creation / edit pop-up dialog.
 * @param {String} title The title of the popup.
 * @param {Object} userData A WatchObject that has to have the following keys/attributes:
 *                          id, title, familyName, firstName, affiliation, email, address, telephone, fax, submission.
 *                          Its information will be displayed as initial values in the dialog.
 * @param {Function} action A callback function that will be called if the user presses ok. The function will be passed
 *                          a WatchObject with the new values.
 */
type("UserDataPopup", ["ExclusivePopupWithButtons"],
    {
        draw: function() {
            var userData = this.userData;
            var self = this;
            self.parameterManager = new IndicoUtil.parameterManager();

            grant = [];
            if (this.grantSubmission) {
                grant = ['Grant submission rights', $B(Html.checkbox({}), userData.accessor('submission'))];
            }

            var form = IndicoUtil.createFormFromMap([
               [$T('Title'), $B(Html.select({}, Html.option({}, ""), Html.option({value:'Mr.'}, $T("Mr.")), Html.option({value:'Mrs.'}, $T("Mrs.")), Html.option({value:'Ms.'}, $T("Ms.")), Html.option({value:'Dr.'}, $T("Dr.")), Html.option({value:'Prof.'}, $T("Prof."))), userData.accessor('title'))],
               [$T('Family Name'), $B(self.parameterManager.add(Html.edit({style: {width: '300px'}}), 'text', false), userData.accessor('familyName'))],
               [$T('First Name'), $B(Html.edit({style: {width: '300px'}}), userData.accessor('firstName'))],
               [$T('Affiliation'), $B(Html.edit({style: {width: '300px'}}), userData.accessor('affiliation'))],
               [$T('Email'),  $B(self.parameterManager.add(Html.edit({style: {width: '200px'}}), 'email', true), userData.accessor('email'))],
               [$T('Address'), $B(Html.textarea(), userData.accessor('address'))],
               [$T('Telephone'), $B(Html.edit({style: {width: '150px'}}), userData.accessor('phone'))],
               [$T('Fax'), $B(Html.edit({style: {width: '150px'}}), userData.accessor('fax'))],
               grant]);

            var buttons = Html.div({},
                    Widget.link(command(curry(this.action, userData, function() {self.close();}), Html.input("button", {}, $T("Save")))),
                    Widget.link(command(function() {self.close();}, Html.input("button", {}, $T("Cancel")))));

             return this.ExclusivePopupWithButtons.prototype.draw.call(this, form, buttons);
         }

     },
     function(title, userData, action, grantSubmission) {
         this.userData = userData;
         this.action = action;
         this.grantSubmission = exists(grantSubmission)?grantSubmission:false;
         this.ExclusivePopup(title,  function(){return true;});
     }
    );

/**
 * Creates a data creation / edit pop-up dialog.
 * @param {String} title The title of the popup.
 * @param {Object} userData A WatchObject that has to have the following keys/attributes:
 *                          id, title, familyName, firstName, affiliation, email, telephone.
 *                          Its information will be displayed as initial values in the dialog.
 * @param {Function} action A callback function that will be called if the user presses ok. The function will be passed
 *                          a WatchObject with the new values.
 */
type("AuthorDataPopup", ["ExclusivePopupWithButtons"],
    {
        draw: function() {
            var userData = this.userData;
            var self = this;
            self.parameterManager = new IndicoUtil.parameterManager();

            var form = IndicoUtil.createFormFromMap([
               [$T('Title'), $B(Html.select({}, Html.option({}, ""), Html.option({value:'Mr.'}, $T("Mr.")), Html.option({value:'Mrs.'}, $T("Mrs.")), Html.option({value:'Ms.'}, $T("Ms.")), Html.option({value:'Dr.'}, $T("Dr.")), Html.option({value:'Prof.'}, $T("Prof."))), userData.accessor('title'))],
               [$T('Family Name'), $B(self.parameterManager.add(Html.edit({style: {width: '300px'}}), 'text', false), userData.accessor('familyName'))],
               [$T('First Name'), $B(self.parameterManager.add(Html.edit({style: {width: '300px'}}), 'text', false), userData.accessor('firstName'))],
               [$T('Affiliation'), $B(self.parameterManager.add(Html.edit({style: {width: '300px'}}), 'text', false), userData.accessor('affiliation'))],
               [$T('Email'),  $B(self.parameterManager.add(Html.edit({style: {width: '200px'}}), 'email', false), userData.accessor('email'))],
               [$T('Telephone'), $B(Html.edit({style: {width: '150px'}}), userData.accessor('phone'))]
               ]);

            var buttons = Html.div({},
                    Widget.link(command(curry(this.action, userData, function() {self.close();}), Html.input("button", {}, $T("Save")))),
                    Widget.link(command(function() {self.close();}, Html.input("button", {}, $T("Cancel")))));

             return this.ExclusivePopupWithButtons.prototype.draw.call(this, form, buttons);
         }

     },
     function(title, userData, action) {
         this.userData = userData;
         this.action = action;
         this.ExclusivePopup(title,  function(){return true;});
     }
    );


/**
 * Creates a list of users. Each user can be edited or removed.
 * It inherits from ListWidget who in turn inherits from WatchObject, so the usual WatchObject methods (get, set)
 * can be used on it. For example 'set' can be used to initialize the list.
 * This means that the users are stored with their id's as keys.
 * @param {String} style The class of the ul that will contain the users.
 * @param {Boolean} allowEdit. If true, each user will have an edit button to change their data.
 * @param {Function} editProcess. A function that will be called when a user is edited. The function will
 *                                be passed the new data as a WatchObject.
 * @param {Boolean} showToggleFavouriteButtons. false by default. If true, favouritize buttons will not be shown.
 */
type("UserListWidget", ["ListWidget"],
     {
         _drawItem: function(user) {
             var self = this;
             var userData = user.get();

             var editButton = Widget.link(command(function() {
                 editPopup = new UserDataPopup(
                     'Change user data',
                     userData.clone(),
                     function(newData, suicideHook) {
                         if (editPopup.parameterManager.check()) {
                             //  editProcess will be passed a WatchObject representing the user.
                             self.editProcess(userData, function(result) {
                                 if (result) {
                                     userData.update(newData.getAll());
                                     if (!startsWith('' + userData.get('id'),
                                                     'newUser')) {
                                         userData.set('id', 'edited' + userData.get('id'));
                                     }
                                 }
                             });
                             suicideHook();
                         }
                     }
                 );
                 editPopup.open();
             }, IndicoUI.Buttons.editButton()));

             var removeButton =
                 Widget.link(command(function() {
                             // removeProcess will be passed a WatchObject representing the user.
                             self.removeProcess(userData, function(result) {
                                     if (result) {
                                         self.set(user.key, null);
                                     }
                                 });

             }, IndicoUI.Buttons.removeButton()));

             if (userData.get('isGroup') || userData.get('_fossil') === 'group') {

                 var removeButtonDiv = Html.div({style: {cssFloat: "right", paddingRight: pixels(10), paddingTop: pixels(5)}}, removeButton);
                 var groupName = $B(Html.span(), userData.accessor('name'));
                 return Html.span({}, removeButtonDiv, Html.span({style:{fontWeight:'bold'}}, 'Group: '), groupName);

             } else {

                 var buttonDiv = Html.div({style: {cssFloat: "right", paddingRight: pixels(10), paddingTop: pixels(5)}});

                 if (IndicoGlobalVars.isUserAuthenticated && exists(IndicoGlobalVars['favorite-user-ids']) && this.showToggleFavouriteButtons && userData.get('_type') === "Avatar") {
                     var favouritizeButton = new ToggleFavouriteButton(userData.getAll()).draw();
                     buttonDiv.append(favouritizeButton);
                 }
                 if (this.allowEdit) {
                    buttonDiv.append(editButton) ;
                 }
                 buttonDiv.append(removeButton);

                 var userName = Html.span({},
                         $B(Html.span(), userData.accessor('familyName'), function(name){return name.toUpperCase();}),
                         ', ',
                         $B(Html.span(), userData.accessor('firstName')));

                 return Html.span({}, buttonDiv, userName);
             }
         }
     },

     function(style, allowEdit, editProcess, removeProcess, showToggleFavouriteButtons) {

         this.style = any(style, "UIPeopleList");
         this.allowEdit = allowEdit;
         this.editProcess = any(editProcess, singleUserNothing);
         this.removeProcess = any(removeProcess, singleUserNothing);
         this.showToggleFavouriteButtons = any(showToggleFavouriteButtons, true);

         this.ListWidget(style);
     }
    );


/**
 * Creates a form field with a list of users.
 * Users can be added from an initial list of users, from a 'new user' dialog, or from a "choose user"
 * dialog which will enable both to search users/groups and propose a list of suggested users (favourites and others).
 * The 'id' attribute of the users in the list will depend from their origin.
 * - If it was added from the search dialog, the id will be 'existingAvXX' (where XX corresponds to the avatar id).
 * - It it was added from the 'new user' dialog, the id will be 'newUserXX', where XX is auto-increment starting from 0.
 * - If it was added from the list of suggested users, it will retain the id of the user that was put in the list.
 * - It the user was edited, and the edited user corresponded to an Avatar, the id will be 'editedXX' where XX is the id of the Avatar used initially.
 *
 */
type("UserListField", ["IWidget"], {

    _highlightNewUser: function(userId) {
        IndicoUI.Effect.highLightBackground($E(this.userList.getId() + '_' + userId));
    },

    getUsers: function() {
        return $L(this.userList);
    },

    clear: function() {
        this.userList.clearList();
    },

    getPrivileges: function() {
        return this.selectedPrivileges;
    },

    draw: function() {
        var self = this;

        var select;
        var buttonDiv = Html.div({style:{marginTop: pixels(10)}});

        if (this.allowSearch || this.includeFavourites || exists(this.suggestedUsers)) {

            var chooseUserButton = Html.input("button", {style:{marginRight: pixels(5)}}, $T('Add Existing'));

            var title = "";
            if (this.includeFavourites || exists(this.suggestedUsers)) {
                title = this.enableGroups ? $T("Add Users and Groups") : $T("Add Users");
            } else {
                title = this.enableGroups ? $T("Search Users and Groups") : $T("Search Users");
            }

            var peopleAddedHandler = function(peopleList){

                // newProcess will be passed a list of WatchObjects representing the users.
                self.newProcess(peopleList, function(value) {
                    if (value) {
                        each(peopleList, function(person){

                            var key;
                            if (person.isGroup || person._fossil === 'group') {
                                key = person.id;
                            } else {
                                key = (person._type === "Avatar") ? "existingAv" + person.id : person.id;
                            }

                            if (person._type === "Avatar" && self.userList.get(key)) {
                                // it is an existing avatar, unchanged, and already exists: we do nothing
                            } else {
                                if (self.userList.get(key)) {
                                    self.userList.set(key, null);
                                }
                                self.userList.set(key, $O(person));
                            }

                            //self._highlightNewUser(id);
                        });
                    }
                });
            };

            chooseUserButton.observeClick(function() {
                var chooseUsersPopup = new ChooseUsersPopup(title, self.allowSearch, self.conferenceId, self.enableGroups,
                        self.includeFavourites, self.suggestedUsers, false, self.showToggleFavouriteButtons, peopleAddedHandler);
                chooseUsersPopup.execute();
            });

            buttonDiv.append(chooseUserButton);
        }


        if (this.allowNew) {

            var addNewUserButton = Html.input("button", {style:{marginRight: pixels(5)}}, $T('Add New') );

            addNewUserButton.observeClick(function(){

                var newUserId = 'newUser' + self.newUserCounter++;
                var newUser = $O({'id': newUserId});

                newUserPopup = new UserDataPopup(
                    $T('New user'),
                    newUser,
                    function(newData, suicideHook) {
                        if (newUserPopup.parameterManager.check()) {
                            newUser.update(newData.getAll());
                            self.newProcess([newUser], function(result) {
                                if (result) {
                                    self.userList.set(newUserId, newUser);
                                    //self._highlightNewUser(newUserId);
                                }
                            });
                            suicideHook();
                        }
                    }
                );
                newUserPopup.open();
            });
            buttonDiv.append(addNewUserButton);
        }

        // User privileges (submission privilege, etc.)
        var privilegesDiv = Html.span({style:{marginTop: pixels(10)}});
        var keysList = keys(this.privileges);
        if (keysList.length>0) {
            privilegesDiv.append(Html.span({},$T("Grant all these users with privileges: ")));
        }
        var comma = ", ";
        for (var i=0; i<keysList.length; i++) {
            if (i+1 == keysList.length) {
                comma = "";
            }
            var key = keysList[i];
            var value = this.privileges[key];
            var checkbox = Html.checkbox({style:{verticalAlign:"middle"}}, value[1]? value[1] : null);
            checkbox.dom.name = key;
            $B(this.selectedPrivileges.accessor(key), checkbox);
            privilegesDiv.append(Html.span({},checkbox, value[0] + comma));
        }

        return Widget.block([Html.div(this.userDivStyle,this.userList.draw()), privilegesDiv, buttonDiv]);

    }
},
    /*
     * @param {String} userDivStyle A CSS class for the div that will sourround the user list.
     * @param {String} userListStyle A CSS class for the user list. It will be passed to the inner UserListWidget.
     *
     * @param {list} initialUsers A list of (fossilized) avatars that will appear initially.
     * @param {Boolean} includeFavourites If True, favourites will appear in the list of suggested users of the ChooseUsersPopup.
     * @param {list} suggestedUsers A list of users that will be offered as options to be added.
     * @param {Boolean} allowSearch If True, the "Choose user" dialog will propose to search.
     * @param {Boolean} enableGroups If True, the "Choose user" dialog will propose to search groups.
     * @param {string} conferenceId for author list search
     * @param {list} privileges dictionary with the privileges that we can set for the users. There is a key and a tuple as vale: (label, default value for checked). E.g. {"grant-manager": ["event modification", false]}
     * @param {Boolean} allowNew If True, a 'New User' button will be present.
     * @param {Boolean} allowEdit If True, users in the list will be able to be edited.
     * @param {Boolean} showToggleFavouriteButtons. false by default. If true, favouritize buttons will not be shown.
     * @param {Function} newProcess A function that will be called when new users (from new data, or from the search dialog, or from the suggested list) is added to the list.
     * @param {Function} editProcess A function that will be called when a user is edited.
     * @param {Function} removeProcess A function that will be called when a user is removed.
     */
    function(userDivStyle, userListStyle,
             initialUsers, includeFavourites, suggestedUsers,
             allowSearch, enableGroups, conferenceId, privileges,
             allowNew, allowEdit, showToggleFavouriteButtons,
             newProcess, editProcess, removeProcess) {

        var self = this;

        this.userList = new UserListWidget(userListStyle, allowEdit, editProcess, removeProcess, showToggleFavouriteButtons);
        this.newUserCounter = 0;

        this.userDivStyle = any(userDivStyle, "UIPeopleListDiv");

        if (exists(initialUsers)) {
            each(initialUsers, function(user){
                if (any(user._type, null) === 'Avatar') {
                    self.userList.set('existingAv' + user.id, $O(user));
                } else {
                    self.userList.set(user.id, $O(user));
                }
            });
        }

        this.includeFavourites = any(includeFavourites, true);
        if (exists(suggestedUsers)) {
            if (suggestedUsers.WatchList) {
                this.suggestedUsers = suggestedUsers;
            } else {
                this.suggestedUsers = new WatchList();
                each(suggestedUsers, function(user){
                    self.suggestedUsers.append(user);
                });
            }
        } else {
            this.suggestedUsers = null;
        }

        this.allowSearch = any(allowSearch, true);
        this.enableGroups = any(enableGroups, false);
        this.conferenceId = any(conferenceId, null);
        this.privileges = any(privileges, {});
        this.selectedPrivileges = new WatchObject();

        this.allowNew = any(allowNew, true);
        this.showToggleFavouriteButtons = any(showToggleFavouriteButtons, true);
        this.newProcess = any(newProcess, userListNothing);
     }
);


/**
 * Buttons to add or remove a user to the list of the currently
 * logged in user's favourites.
 */
type("ToggleFavouriteButton", ["InlineWidget"], {
    draw: function() {
        var self = this;

        var imageRemove = Html.img({
            src: imageSrc("star"),
            alt: 'Remove from Favorites',
            title: $T('Remove from your list of favorite users'),
            style: this.imageStyle
            });

        var imageAdd = Html.img({
            src: imageSrc("starGrey"),
            alt: 'Add to Favorites',
            title: $T('Add to your list of favorite users'),
            style: this.imageStyle
        });

        var imageLoading = Html.img({
            src: imageSrc("loading"),
            alt: 'Loading',
            title: $T('Communicating with server'),
            style: this.imageStyle
        });

        var starIcon = $B(Html.span(), this.stateWatchValue, function(state){
            if (state) { // user is favourite
                return imageRemove;
            } else { // user is not favourite
                return imageAdd;
            }
        });

        var content = Html.span({}, starIcon);

        imageRemove.observeClick(function(event){
            content.set(imageLoading);
            indicoRequest('user.favorites.removeUser',
                {
                    value: [{id:self.avatar.id}]
                },
                function(result,error){
                    content.set(starIcon);
                    if(!error) {
                        IndicoGlobalVars['favorite-user-ids'][self.avatar.id] = false;
                        self.stateWatchValue.set(false);
                        if (exists(self.observer)) {
                            self.observer(self.avatar, false);
                        }
                    } else {
                        self._error(error); //Implemented in InlineWidget
                    }
                });
            stopPropagation(event);
        });

        imageAdd.observeClick(function(event){
            content.set(imageLoading);
            indicoRequest('user.favorites.addUsers',
                    {
                        value: [{id:self.avatar.id}]
                    },
                    function(result,error){
                        content.set(starIcon);
                        if(!error) {
                            IndicoGlobalVars['favorite-user-ids'][self.avatar.id] = true;
                            if (exists(IndicoGlobalVars['favorite-user-list'])) {
                                IndicoGlobalVars['favorite-user-list'].push(self.avatar);
                                IndicoGlobalVars['favorite-user-list'].sort(userSort);
                            }
                            self.stateWatchValue.set(true);
                            if (exists(self.observer)) {
                                self.observer(self.avatar, true);
                            }
                        } else {
                            self._error(error);  //Implemented in InlineWidget
                        }
                    });

            stopPropagation(event);
        });

        return this.IWidget.prototype.draw.call(this, content);
    }
},
    /**
     * Constructor
     */
    function(avatar, customImgStyle, initialState, observer){
        this.IWidget();

        this.avatar = avatar;

        customImgStyle = any(customImgStyle, {});
        this.imageStyle = merge({verticalAlign:'middle', cursor:'pointer'});

        this.observer = any(observer, null);

        this.stateWatchValue = null;

        if (!exists(IndicoGlobalVars['favorite-user-ids'])) {
            IndicoGlobalVars['favorite-user-ids'] = {};
            /*IndicoGlobalVars['favorite-user-list'] = [];*/
        }
        if (!exists(IndicoGlobalVars.userFavouritesWatchValues)) {
            IndicoGlobalVars.userFavouritesWatchValues = {};
        }

        if(!exists(IndicoGlobalVars.userFavouritesWatchValues[avatar.id])) {
            if(exists(IndicoGlobalVars['favorite-user-ids'][avatar.id])) {
                IndicoGlobalVars.userFavouritesWatchValues[avatar.id] = $V(IndicoGlobalVars['favorite-user-ids'][avatar.id] === true);
            } else {
                if (!exists(IndicoGlobalVars['favorite-user-ids']) && !exists(initialState)) {
                    alert("Warning: ToggleFavouriteButton used without IndicoGlobalVars['favorite-user-ids'] variable and without initialState");
                }
                initialState = any(initialState, false);
                IndicoGlobalVars.userFavouritesWatchValues[avatar.id] = $V(initialState);
            }
        }

        this.stateWatchValue = IndicoGlobalVars.userFavouritesWatchValues[avatar.id];
    }
);