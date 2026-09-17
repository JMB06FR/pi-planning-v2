# PI Planning v2

A static two-day PI Planning agenda, deployed to GitHub Pages from `main`.

## Maintain the agenda from Excel

1. Open **Edit agenda** and choose **Import Excel, CSV or JSON**.
2. Select your `.xlsx` workbook. The importer reads the sheet named **Agenda**, starting at row **11**:

   | Excel column | App field |
   | --- | --- |
   | B | Time |
   | C | Value stream; multiple comma/semicolon/newline-separated streams become ALL |
   | D | Room |
   | E | Participants / product (value stream for plenaries, product for breakouts) |
   | F | Purpose |

3. Review the editable rows and any flagged source cells. Day 1 / Day 2 headings in column E set the day. Vertical merged cells are expanded. A blank time immediately following a session in the **same merged purpose block** inherits that session's time (the confirmed row 44 case). Other missing times are flagged, not guessed.
4. **Preview saved draft** opens the participant view without publishing. Day and value-stream filters include ALL sessions. The event quarter is taken from purpose text when consistent.
5. Click **Download rooms.json**. Follow the GitHub upload link, sign in, upload the file with that exact name to the repository root on `main`, and commit the change.
6. Wait for the Pages deployment under Actions to complete, then refresh the participant page.

Import reads the workbook locally; it does not upload the original file or import conferencing links, Miro links or other worksheets. No credentials are stored. Only repository writers can publish; other visitors can only modify their own browser drafts.

## Import rules and review

- Session type is inferred from purpose: Breakout, Plenary, Break or Session (needs review). Planning adjustment, plan reviews, management review and risks/impediments are plenaries.
- Purpose and participant text are preserved; team is optional because the template has no dedicated team column.
- Times such as `08:55 - 9:45` are normalized. Open-ended `from 18:00` is supported.
- Missing room is permitted for a Break and displayed as **Not specified**. Missing required session fields prevent publication download.
- Source value streams are retained after trimming/uppercasing. Unrecognised values and conflicting plenary participants are flagged for review rather than corrected automatically.
- Formula cells use saved Excel results; recalculate and save in Excel before importing. Macros and external workbook links are not executed.
- Standard unencrypted `.xlsx` files up to 5 MB are supported (30 MB unpacked limit). Browser `DecompressionStream('deflate-raw')` support is required. An actionable error is displayed if unsupported. `.xls` and password-protected files are not supported.

The included 26Q4 agenda comes from the corrected workbook `General Programme EMA PI Planning 26Q4 for the 2 days(1).xlsx`: **95 sessions**, comprising 47 on Day 1 and 48 on Day 2 (52 breakouts, 38 plenaries, 5 breaks). Row 44 uses 11:30–16:00 as confirmed by the owner. Day 1 lunch has no specified room.

## Drafts and CSV

Drafts save in this browser, without syncing to other devices. Import replaces the draft after confirmation. **Reload published agenda** discards it after confirmation. Download a CSV draft before clearing browser storage or changing computers. Storage failures are reported.

Export CSV to obtain the editor's column template (`day,time,vs,location,product,purpose,type,team`). In Excel, save as CSV UTF-8. Comma/semicolon delimiters, reordered columns, quoted commas/quotes and multiline cells are supported. Legacy six-column CSV and JSON remain readable. The Excel programme layout is imported through `.xlsx`, not by exporting the entire programme as CSV.

CSV export also backs up incomplete drafts. Formula-like text is prefixed with an apostrophe on CSV export to prevent spreadsheet formula execution. JSON publication download validates required fields and times. Excel source-row numbers are retained in browser drafts for review but omitted from published JSON.

## Local preview and checks

Run `python3 -m http.server 8000` from this directory and open http://localhost:8000/editor.html. Use HTTP rather than a file URL.

Run `node tests/agenda-import.test.cjs` for mapping regression tests. JavaScript syntax checks and actual corrected-workbook ZIP/data mapping tests were completed during development. Browser rendering and end-to-end interaction still need verification; the development environment did not have an installed test browser.

Implementation references: [Microsoft shared-string documentation](https://learn.microsoft.com/en-us/office/open-xml/spreadsheet/working-with-the-shared-string-table) and [MDN decompression formats](https://developer.mozilla.org/en-US/docs/Web/API/DecompressionStream/DecompressionStream).

Branch `backup-2026-09-17` preserves the app before the editor was added. The original alternate `rooms1.json` is not used or modified.
