# PI Planning v2

A static PI Planning room directory, deployed to GitHub Pages from `main`.

## Maintain the agenda

1. Open **Edit agenda** from the participant page (`editor.html`).
2. Edit the table; add, duplicate or delete sessions. Drafts save automatically in this browser. They are not published or synced to other devices.
3. Use **Download rooms.json** when ready. All six fields are required; time ranges use `HH:MM-HH:MM` and must finish after they start.
4. Follow the editor's GitHub upload link. Sign in, upload the downloaded file under the exact name `rooms.json` to the repository root on `main`, and commit the change.
5. Wait for the Pages deployment under Actions to complete, then refresh the participant page.

Only repository writers can publish. The editor itself is public and holds no credentials; other visitors can edit their own browser drafts but cannot publish through it.

## Excel / CSV

Export CSV from the editor to obtain the column template. In Excel, save as **CSV UTF-8**, then import that file. Comma and semicolon separators, quoted commas, quotes and multiline cells are supported. The six column names are `time,location,product,team,vs,type`; columns may be reordered. JSON imports are also supported. Import replaces the current draft after confirmation. Spreadsheet formula-like values are prefixed with an apostrophe on CSV export for safety.

**Reload published agenda** discards the local draft after confirmation. Download drafts before clearing browser storage or changing computers. Browser storage can be unavailable; the editor reports when saving fails.

This editor maintains the currently displayed agenda in `rooms.json`. It does not change the event heading or maintain `rooms1.json`. The existing participant page remains responsible for the day/event title.

## Local preview

Run `python3 -m http.server 8000` from the repository directory and open http://localhost:8000/editor.html. Use an HTTP server, not a file URL, so the agenda can load.

## Backup

Branch `backup-2026-09-17` preserves the app before the editor was added.
