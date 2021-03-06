<% import MaKaC.common.Configuration as Configuration %>
<%
if dark is not UNDEFINED:
    dark_ = dark
else:
    dark_ = False;
%>

<!-- TODO: remove? -->
<script type="text/javascript">
function envoi(){
    //alert('Le code de la langue choisie est '+document.forms["changeSesLang"].elements["lang"].value)
    document.forms["changeSesLang"].submit()
}
</script>

<!-- TODO: remove permanently? -->
% if isFrontPage:
    <div id="policyOfUse">
        <h1>${ _("Policy of Use")}</h1>
        ${ _("If you want to use it for CERN-related projects, please contact")} <a href="mailto:indico-support@cern.ch"> ${ _("Indico support")}</a>${ _(""".
        Non-CERN institutes may install the Indico software locally under GNU General Public License
        (see the""")} <a href="http://cern.ch/indico">${ _("project web site")}</a>).
    </div>
% endif

<div id="poweredBy" class="${"longFooter " if shortURL != "" and not isFrontPage else ""}footer${" footerDark" if dark_ == True else ""}">

<div style="margin-bottom: 15px; font-family: monospace; font-size: 10px;">
  % if shortURL != "" and not isFrontPage:
  <div>${ shortURL }</div>
  % endif

  % if modificationDate != "":
  <div>${ _("Last modified: ") + modificationDate }</div>
  % endif
</div>

            <a href="http://www.cern.ch">
              <img src="${ systemIcon("cern_small") }" alt="${ _("Indico - Integrated Digital Conference")}" style="vertical-align: middle; margin-right: 12px;"/>
            </a>
            <span style="vertical-align: middle;">${ _("Powered by ")}<a href="http://indico-software.org">Indico</a></span>

            % if Configuration.Config.getInstance().getWorkerName()!="":
                <span style="display: none;">${ Configuration.Config.getInstance().getWorkerName() }</span>
            % endif
</div>
