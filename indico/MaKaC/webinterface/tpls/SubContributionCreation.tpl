<form method="POST" action="${ postURL }">
    ${ locator }
    <table width="60%" cellspacing="0" align="center" border="0" style="border-left: 1px solid #777777;padding-left:2px">
        <tr>
            <td colspan="2" class="groupTitle"> ${ _("Creating a new sub contribution (basic data)")}</td>
        </tr>
        <tr>
            <td nowrap class="titleCellTD"><span class="titleCellFormat"> ${ _("Title")}</span></td>
            <td bgcolor="white" width="100%"><input type="text" name="title" size="80" value="${ title }"></td>
        </tr>
        <tr>
            <td nowrap class="titleCellTD"><span class="titleCellFormat"> ${ _("Description")}</span></td>
            <td bgcolor="white" width="100%"><textarea name="description" cols="80" rows="10" wrap="soft">${ description }</textarea></td>
        </tr>
        <tr>
            <td nowrap class="titleCellTD"><span class="titleCellFormat"> ${ _("Keywords")}<br><small>( ${ _("one per line")})</small></span></td>
            <td bgcolor="white" width="100%"><textarea name="keywords" cols="65" rows="3">${ keywords }</textarea></td>
        </tr>
        <tr>
            <td nowrap class="titleCellTD"><span class="titleCellFormat"> ${ _("Duration")}</span></td>
            <td bgcolor="white" width="100%">
                <input type="text" size="2" name="durationHours" id="durationHours" value="${ durationHours }">:
                <input type="text" size="2" name="durationMinutes" id="durationMinutes" value="${ durationMinutes }">
            </td>
        </tr>
        ${ presenter }
        <tr><td>&nbsp;</td></tr>
        <tr align="center">
            <td colspan="2" style="border-top:1px solid #777777;" valign="bottom" align="center">
                <table align="center">
                    <tr>
                        <td><input type="submit" class="btn" value="${ _("ok")}" name="ok" id="okBtn"></td>
                        <td><input type="submit" class="btn" value="${ _("cancel")}" name="cancel"></td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</form>
<script  type="text/javascript">

        IndicoUI.executeOnLoad(function()
    {
        var parameterManager = new IndicoUtil.parameterManager();
        var submitButton = $E('okBtn');

        submitButton.observeClick(function(){
            if (!parameterManager.check()) {
                return false;
            }
        });

        parameterManager.add($E('durationHours'), 'int', false);
        parameterManager.add($E('durationMinutes'), 'int', false);
    });
</script>