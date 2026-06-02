# Blerp Scraper

A small browser-based tool that exports your **Blerp.com My Stream** soundboard into a JSON file you can import into the **Sound Board App**.

No server or login to Blerp from this app — you run a script in your browser **on blerp.com** while logged in, and it downloads a board JSON file.

## How to use

1. Open **[https://blerp.com/my-stream](https://blerp.com/my-stream)** in your browser and **log in**.
2. Open **Developer Tools** (F12) → **Console** tab.
3. Copy the export script:
   - Either open `index.html` in this folder and click **Copy script to clipboard**,  
   - Or open `blerp-export.js` in a text editor and copy all of it.
4. **Paste** the script into the console and press **Enter**.
5. If sounds were found, a JSON file will download (e.g. `from-blerp-1234567890.json`).
6. In the **Sound Board App**, use **Import Board** and select that file.

## Downloading the actual sound files (optional)

After running the export script, you can try to download each sound’s MP3 from Blerp’s CDN. In the same console run: **`BlerpExport.downloadSoundFiles()`**. This triggers one browser download per sound. If the CDN blocks cross-origin requests (CORS), downloads may fail; in that case use the **Sound Board App** → **Download all sounds** to get a single ZIP with the board JSON and all MP3s (when the app is served over HTTP).

## If no file downloads

- Make sure you are on **blerp.com/my-stream** and your board has at least one sound.
- In the same console, run: **`BlerpExport.debug()`**  
  This will log what data sources exist (Apollo cache, Next data, etc.) and sample keys. Use that to see why extraction might have failed.

## Output format

The downloaded JSON matches the Sound Board App board schema: `schemaVersion`, `id`, `name`, `sounds[]` with `id`, `title`, `fileUrl`, `imageUrl`, `category`, `tags`, `volume`, `startMs`, `endMs`, etc. You can edit the file or re-import it after changing it.

## Files

- **blerp-export.js** — The script you paste into the Blerp console.
- **index.html** — Local helper page with instructions and a “Copy script to clipboard” button.
