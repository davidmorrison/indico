type("PreLoadHandler", [],
     {
         execute: function() {

             var self = this;

             if (this.counter === 0) {
                 this.process();
             } else {
                 $L(this.actionList).each(function(preloadItem) {

                     var hook = new WatchValue();
                     hook.set(false);
                     hook.observe(function(value){
                         if (value) {
                             bind.detach(hook);
                             self.counter--;

                             if (self.counter === 0) {
                                 self.process();
                             }
                         }
                     });

                     if (preloadItem.PreLoadAction) {
                         preloadItem.run(hook);
                     } else {
                         preloadItem.call(self, hook);
                     }
                 });
             }
         }
     },
     function(list, process) {
         this.actionList = list;
         this.counter = list.length;
         this.process = process;
     }
    );


type("ServiceDialog", ["ExclusivePopup"],
    {
        _error: function(error) {
            IndicoUI.Dialogs.Util.error(error);
        },

        request: function(extraArgs) {
            var self = this;
            var args = extend(clone(this.args), extraArgs);

            var killProgress = IndicoUI.Dialogs.Util.progress();

            jsonRpc(Indico.Urls.JsonRpcService, this.method, args,
                function(response,error) {
                    if(exists(error)) {
                        killProgress();
                        self._error(error);
                    } else {
                        self._success(response);
                        killProgress();
                        self.close();
                    }
                }
            );
        }
    },

    function(endPoint, method, args, title, closeHandler) {
       this.endPoint = endPoint;
       this.method = method;
       this.args = args;
       this.ExclusivePopup(title, closeHandler);
    }
);


type("ServiceDialogWithButtons", ["ExclusivePopupWithButtons", "ServiceDialog"], {},
    function(endPoint, method, args, title, closeHandler){
        this.endPoint = endPoint;
        this.method = method;
        this.args = args;
        this.ExclusivePopupWithButtons(title, closeHandler);
    }
);



/**
 * Dialog for unforeseen errors that will ask to the user if he wants
 * to send an error report.
 */
type("ErrorReportDialog", ["ServiceDialogWithButtons"],
     {
         _sendReport: function(email) {
             var self = this;
             this.error.userMail = email.get();
             indicoRequest('system.error.report',
                           this.error,
                           function(result, error){
                               if (error) {
                                   alert($T("Unable to send your error report: ") + error.message);
                               }
                               else {
                                   if (result) {
                                       alert($T("Your report has been sent. Thank you!"));
                                   } else {
                                       alert($T("Your report could not be sent to the support address."));
                                   }
                                   self.close();
                               }
                           }
                          );
         },

         draw: function() {
             var self = this;
             var email = new WatchObject();

             // TODO: force unidirectional binding?
             $B(email.accessor(), indicoSource('user.data.email.get', {}));

             var content = Html.div({style:{paddingLeft:pixels(10), paddingRight: pixels(10), paddingBottom:pixels(10)}},
                     Html.div({style:{marginBottom: pixels(10), width:'300px', textAlign: 'center'}}, $T('An error has occurred while processing your request. We advise you to submit an error report, by clicking "Send report".')),
                     Html.unescaped.div({style:{color: 'red', marginBottom: pixels(10), width: '300px', maxHeight: '75px', textAlign: 'center', overflow: 'auto'}},
                              this.error.message),
                     Html.div({style:{marginBottom: pixels(10), textAlign: 'center'}},
                              Html.label({},"Your e-mail: "),
                              $B(Html.input("text",{}), email.accessor())));

             var buttons = Html.div({},
                     Widget.link(command(
                         function() {
                             self._sendReport(email);
                         },
                         Html.input('button', {}, $T('Send report')))),
                     Widget.link(command(
                         function() {
                             self.close();
                         },
                         Html.input('button', {style:{marginLeft: pixels(5)}}, $T('Do not send report'))
                     )));

             return this.ServiceDialogWithButtons.prototype.draw.call(this, content, buttons);
         }
     },
     function(error) {
         this.error = error;
     }
);

/**
 * Dialog for errors whose type is "noReport", such as "not logged in" warning
 */
type("NoReportErrorDialog", ["AlertPopup"], {

    __getTitle: function() {
        var title = this.error.title;
        return Html.span('warningTitle', title ? title : $T("Warning"));
    },

    __getContent: function() {

        var content = Html.div({style: {textAlign: 'left'}});
        content.append(Html.div({}, this.error.message));
        content.append(Html.unescaped.div("warningExplanation", this.error.explanation));

        if (this.error.code == 'ERR-P4') {
            content.append(Html.div({style:{marginTop:pixels(10)}},
                    Html.a({href: Indico.Urls.Login+'?returnURL='+document.URL}, $T("Go to login page"))));
        }

        return content;
    }
},
    function(error){
        this.error = error;
        this.AlertPopup(this.__getTitle(), this.__getContent());
    }
);

type("ProgressDialog",["ExclusivePopup"],
     {
         draw: function() {
             return this.ExclusivePopup.prototype.draw.call(
                 this,
                 Html.div('loadingPopup',
                          Html.div('text', this.text)),
                 {background: '#424242', border: 'none', padding: '20px', overflow:'auto'});
         }
     },
     function(text) {
         if (text === undefined) {
             this.text = $T('Loading...');
         } else {
             this.text = text;
         }
         this.ExclusivePopup();
     }
    );

IndicoUI.Dialogs = {};
