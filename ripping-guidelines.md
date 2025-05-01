# Ripping Guidelines

When contributing please follow the community-agreed standards explained below.

For help try [HCS64 Discord](https://discord.gg/7ddT4pP) or the HCS64 forums.

To upload new sets use [vgm-upload.hcs64.com/](https://vgm-upload.hcs64.com/). If file is too big post a link on Discord or the forums (if it's small please upload it with that link).

## Guidelines

### Include original audio files, as extracted from the games
For streamed audio don't transform between similar-ish formats, like `.FSB` to `.OGG`, `.VAG` to `.SS2`, or even regular `.WAV` to `.FLAC`. Also don't add tags to `.OGG` or `.MP3`.

Even if quality is (seemingly) untouched, we want to preserve original metadata. It often has non-obvious info like stream names or loop points, and that info is destroyed when converting between formats. We also don't know if the original file had metadata once converted.

You can always convert or modify original files in the archive to anything later, while converted data can't be fully undone.

Also see later guidelines about handling audio banks and bigfiles before splitting.

*vgmstream* can play *many* original formats as-is, plus it's in active development and more formats are being added and fixed. It also has [TXTH](https://github.com/vgmstream/vgmstream/blob/master/doc/TXTH.md) and [TXTP](https://github.com/vgmstream/vgmstream/blob/master/doc/TXTP.md) features that can make many types of odd original data playable without having to transform anything.

#### Exceptions:
- Sequenced audio (MIDI-like formats found in older generation consoles) can be converted into formats like `.SPC`, `.PSF`, `.2SF`, `.VGM` and so on, and tagged/renamed freely
- When ripping CD-DA audio from games you may use a lossless format like FLAC rather than WAV, and it can be freely tagged
- Videos must be "demuxed" (separate audio data), but don't decode its original audio into `.WAV`
- Having helper files not part of the game is fine (like `.m3u`, `.txtp`, `!info.txt`, and so on)
- If you used custom extraction tools or scripts to get audio consider including them (preferably packed like `!extra.7z`), for the benefit of future rippers
- The rules aren't absolute, various issues are judged case by case

### Compress sets using .7z archives
Use `.7z` and *LZMA2*.

For streamed audio (big files) preferably use *non-solid* archive setting, since it decompresses considerably faster.

For sequenced audio it's good to use *solid* archives.

### Follow the same naming convention as other sets
Typically: `Game Name in English [name in other region] (Release date as YYYY-MM-DD)(Developer)(Publisher)[Platform].7z`

#### Notes
- Optionally add `[uploader-name] (set name).7z` to make your rips more recognizable (automatically done if logged in)
- May include extra info for the uploaders in a suffix, like: `(set name)[re-rip].7z`, `(set name)[updated].7z` and so on (will be removed when uploaded)
  - please add that info **at the end**. 
- Replace colons with a dash: `Hyrule Warriors: Age of Calamity` turns into `Hyrule Warriors - Age of Calamity`
- Self-published games use a single descriptor, i.e. `Piczle Colors Demo (2019-01-17)(Rainy Frog)[Switch].7z`.
- Don't include `Inc.`, `Ltd.` or other minor/useless legal identifiers in developer or publisher names

### Don't create a "base folder" with the name of the archive.
Avoid having a `Game (2000-01-01)(Developer)(Publisher)[PC].7z` set that starts with a folder like `/Game (2000-01-01)(Developer)(Publisher)[PC]/`.

### Don't include SFX for no reason
This archive is mainly for music. There are better places and communities to archive game SFXs.

It's good to keep musical SFX like jingles, or banks with music and sfx together, but please don't include folders full of unrelated SFX like explosions or hits.

Ambient audio can be kept if interesting enough (such as creating mood or tension in horror games). If it's just minor or generic stuff (such as river sounds) it can probably be omitted.

It's fine to have music and sfx/voices mixed in the same track (such as from videos).

### Don't rename the game's files
We want to preserve how the original files were named when possible.

If you want to "tag" streamed files (playable with *vgmstream*), please use [!tags.m3u](https://github.com/vgmstream/vgmstream/blob/master/doc/USAGE.md#tagging) instead of renaming. There are other plugins like *foo_external_tags* if you prefer them.

Some older sets have renamed files since it was the only option back then, but for new sets please avoid it.

Also generally avoid changing or making up extensions (report unplayable extensions so *vgmstream* can add them), to keep files simple (playable as-is). Sometimes renaming also causes non-obvious issues, for example Capcom's `.SNGW` is just `.OGG`, but uses a non-standard multichannel order that can't be detected once extension is changed.

Some tools however don't extract files with correct extensions to begin with (like using `.WAV` instead of `.WEM`), and should be renamed in that case.

For raw data without extension (extracted from bigfiles), using `.vgmstream` + TXTH is a good compromise.

#### Exceptions:
- bigfiles/zip-like containers may contain names; try to use them if possible
- for files inside bigfiles without filenames, use recognizable patterns like `(container-name)_(file-number).(extension)`.
- when moving files in a bunch of directories into root, you may put the tilde-separated path into the name, e.g. `level1~action.mus`
- you may change common extensions that get hijacked by players to our designated fake ones if necessary (e.g. `.OGG` -> `.LOGG`, `.WAV` > `.LWAV`, etc)
- you may name `.TXTP`, `.*SF` and other fake formats you create anything
- differing tracks between regional versions in the same dir may use suffix indicating region in square brackets, e.g. `track1 [US].mus`
- movie files may be prefixed like `(mov) intro.bik`, however just putting them in a `movie/` subfolder is simpler
- mobile games sometimes download files then rename them to a hashed name; should be renamed to the original name if possible


### Try to keep main audio (i.e. not movies) in the root of the 7z archive
You may add a few folders to organize crowded sets, but there is no need to keep folders 1:1 like the original game (folders like `files/audio/bgm/stages/...` don't really benefit much) .

If there are only a few files to begin with no point to keep them in a `bgm/` subfolder, either.

A typical layout would be:
```
bgm01.fsb
bgm02.fsb
...
dlc1/bgm01.fsb
dlc1/...
movies/intro.bik
```


Consider adding `.M3U` or `.TXTP` if main files are in subfolders or must be sorted somehow.

### Don't upload partial updates and instead re-upload the full set with changes
For example, don't upload a few files from the latest version of the game or the DLC separate from the main set.

Sets should contain all music one could hear in a game, rather than having to download a bunch of pieces to get the full thing.

Similarly don't upload just !tags.m3u or some tiny part you want to update, just go ahead and reupload the whole thing.

### Put DLC and updates in subfolders.
DLC audio that can't be acquired on their own (isn't a separate product) should go together with their parent set.

If a revision of a game changes music files, create a new folder for them, named as the version number.

### Make sets ready to upload as-is and avoid offloading work to the maintainers
The VGM archive is managed by few volunteers. If there are 100 pending sets at a time and we'd have to spend ~3 minutes to download/fix/reupload them, that would take +5 hours of work.

So please try to make sets as conforming as possible so that they can be processed semi-automatically.

This includes putting notes for the uploaders inside sets (requires downloading the whole set) or not using the official uploader.

### Other recommendations

#### When possible keep audio banks and containers as-is
*vgmstream* supports many kinds of [audio banks and containers](https://github.com/vgmstream/vgmstream/blob/master/doc/USAGE.md#containers), such as `.fsb`, `.bank`, `.srsa`+`.srst`, `.acb`+`.awb`, etc.

We want to keep *audio formats* untouched. So avoid things like extracting `.hca` from `.awb` and keep companion files like `.acb` (not required to play, but have name metadata), or splitting `.fsb` into smaller `.fsb`.

If you just want to extract or split so it's easier to find or play single files, you can use the [TXTP](https://github.com/vgmstream/vgmstream/blob/master/doc/TXTP.md) function to access any subsong directly. Tools like [this script](https://github.com/vgmstream/vgmstream/blob/master/cli/tools/txtp_maker.py) can create `.TXTP` from audio banks.

Games may use simple *bigfiles* instead of actual *audio banks*. If the *bigfile* is just a generic or zip-like data container, with nothing audio related, it can be safely extracted. Conversely if it has audio characteristics, is only used for audio, or contains useful audio metadata, preferably don't split it (use [TXTH](https://github.com/vgmstream/vgmstream/blob/master/doc/TXTH.md) to get it working or report).

For Wwise's `.PCK` it can be considered a virtual filesystem and should be extracted with tools like [this script](https://github.com/bnnm/wwiser-utils/blob/master/scripts/wwise_pck_extractor.bms).

#### Demux (extract) audio from videos
Tools like VGMToolbox, FFmpeg or custom .BMS can extract audio for various videos (.BIK, XA .STR, .USM, etc).

*vgmstream* can play some videos as-is, but video data is often huge and useless for us, and should be discarded.

Also better avoid tons of video that are just voices/sfx or silent.

#### When updating an existing set (not a full rerip) try to use previous files as a base
By keeping previous files their older timestamp is preserved. That makes detecting new songs easier.

#### Avoid version numbers in the set name unless you have a good reason
Like `Blah (2.0) (...)[...].7z`. This makes automation harder and previous set may not be detected as needing to be removed.

A good reason to have (2.0) is for example when a game's audio changed drastically between versions (basically redone).

New audio added between versions should go in the original set, possibly in a N.N version subfolder if sizeable enough.

If you want to show that the set is up to date, best put that version in a text file. However, the set's modified date is often a better way to judge how current it is.

#### Avoid renaming when reuploading existing sets
If we have `Prince of Persia - The Sands of Time (2003-12-02)(Ubisoft)[PC]` don't upload an updated set like `Prince of Persia - The Sands of Time (2003-12-02)(Ubisoft Montreal)(Ubisoft)[PC][updated]`  (add *Ubisoft Montreal* to the name).

Automation tools can't detect these minute changes and wouldn't mark the set as updated, so we end up with a copy of the set.

Instead, request set renames in Discord or forums.

#### Unplayable audio should be tagged as "[unplayable]"
*vgmstream* has a [TXTH](https://github.com/vgmstream/vgmstream/blob/master/doc/TXTH.md) feature that can make many forms of unplayable audio work.

If audio is still (mostly) not playable with no known tool that works, it can be still uploaded like: `Luigi's Mansion (2001-09-14)(Nintendo EAD)(Nintendo)[GC][unplayable]`.

#### CD-DA sets should keep original track number
If you name them `01-Title.flac`, `02-Boss.flac` and so on it's hard to know if the game really has .FLAC named like that, or it's reordered CD-DA audio.

Instead name them in track order, like `Track02.flac` or `Track02 - Title.flac`, `Track03.flac` and so on, so the origin is clearer. You can use a `.m3u` to reorder if needed.

#### Don't mix games from different platforms
Some games have different formats per platform (PC vs PS2 vs GameCube).

Some cases files are 99% the same save for a few files.

For now simply upload a separate set per platform and don't make subdir for PC / PS2 / GC with the few different files; there is enough server space to keep them separate.


## [Fix - (explanation)] sets
Sets that don't follow the guidelines may be accepted and marked like `Game (yyyy-mm-dd)(Dev)(Publisher)[PC][fix - remove base folder]`, and are shown a bit differently in the frontend.

That would mean there is a base folder inside the set (like `/Game (yyyy-mm-dd)(Dev)(Publisher)[PC]/`) that should be removed, as per the above guidelines.

Anybody may fix it and upload a fixed set like this: `Game (yyyy-mm-dd)(Dev)(Publisher)[PC][fixed].7z`.

If the *(explanation)* is a mistake, please tell us in Discord or forums so we can recheck again. Sometimes it's hard to assess if the set is really correct. These tags are added not call you out personally, but simply as a reminder of something that can be improved.


## Rationale
The above guidelines are meant to improve preservation (original data is reasonably kept), reliability (sets will work like they should), and consistency (all sets have similar quality), as well as having good "listenable" music sets.

Going through hoops is annoying, but we want to ensure some basic standards. If 99% of uploaded sets follow certain conventions it's natural new uploads also follow them.

Don't get discouraged if the guidelines seem a bit strict, the community can guide you if needed. Those rules are a minor annoyance, but also a way to collaborate with others in building a good quality archive.
