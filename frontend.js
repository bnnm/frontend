/* base */

"use strict";
(function () {
    const CONFIG = { }
    CONFIG.WB_SETS_URL = 'index-clean.json';
    CONFIG.WB_EXTS_URL = 'exts.json';
    CONFIG.WB_USE_EXTERNAL_FILELISTS_SAMEFOLDER = false;
    CONFIG.WB_USE_EXTERNAL_FILELISTS_SUBFOLDER = true;
    CONFIG.WB_FORCE_SET_RELOAD = true;

    CONFIG.DB_FILELISTS_CACHE_MAX = 300;
    CONFIG.DB_FILELISTS_EVICT_NUM = 100;
    CONFIG.DB_FILELIST_EXTS_LESSER = [
        'txt','m3u','xml','xml~','json','ini','cue','sh','bat','ps1','lua',
        '7z','zip','rar','lzh','png','jpg','jpeg','exe',
    ];

    CONFIG.DB_SORT_RECENT = 'recent';
    CONFIG.DB_SORT_DATE = 'date';
    CONFIG.DB_SORT_NAME = 'name';

    //CONFIG.DB_EXTS_ARCHIVE = ['7z','zip'];
    CONFIG.DB_REVERSED_SYSTEM = 'cdi'
    CONFIG.DB_REVERSED_TAG_LW = '[amiga]'
    CONFIG.DB_REVERSED_EXTS = ['mod','md','cust','smus','instr','ss','p4x','mdat','mus','core','tune','bp','jpn','smp','pru2','flac','smpl'];

    let exts_types = {
        'ext-txt': ['!tags.m3u','txt','m3u','xml','xml~','json','ini','cue','sh','bat','ps1','lua'], //bms
        'ext-bin': ['bin','7z','zip','rar','lzh','png','jpg','jpeg','exe',  'fev','ktsl2gcbin','bfsar','brsar','bcsar','bisar','names','zarc','db','lz'],
        'ext-lib': ['2sflib','ncsflib','dsflib','gsflib','psflib','psf2lib','snsflib','ssflib','usflib']
    }
    CONFIG.PT_TOTALS_EXT_TYPE = map_exts(exts_types);
    CONFIG.PT_TOTALS_TYPES_INFO = {
        '':'standard files',
        'ext-txt':'text files',
        'ext-bin':'bin files',
        'ext-lib':'lib files',
    };
    CONFIG.PT_PAGE_RESULTS = 100;
    CONFIG.PT_SYSTEM_CONFIG = {
        '2sf': "DS",
        '3do': "3DO",
        '3sf': "3DS",
        'dsf': "Dreamcast",
        'fmtowns': "FM Towns",
        'gbs': "GB",
        'gcn': "GameCube",
        'gsf': "GBA",
        'hes': "PC Engine",
        'hoot': "Hoot",
        'kss': "Master System",
        'ncd': "Neo Geo CD",
        'nsf': "NES",
        'pc': "PC",
        'psf': "PS1",
        'psf2': "PS2",
        'psf3': "PS3",
        'psf4': "PS4",
        'psf5': "PS5",
        'psp': "PSP",
        's98': "Japanese PC",
        'smd': "Mega Drive",
        'spc': "SNES",
        'ssf': "Saturn",
        'usf': "N64",
        'x360': "Xbox 360",
        'xbox': "Xbox",
        'vita': "Vita",
        'wii': "Wii",
        'wiiu': "Wii U",
        'wsr': "WonderSwan",
        'mobile': "Mobile",
        'switch': "Switch",
        'xone': "Xbox One",
        'xse': "Xbox Series",
        'amiga': "Amiga",
        'atari_st': "Atari ST",
        'j2me': "J2ME",
        'gizmondo': "Gizmondo",
        'other': "Other systems",
    }
    CONFIG.DB_SYSTEMS = Object.keys(CONFIG.PT_SYSTEM_CONFIG);
    
    // big subdomains can have sub-systems, pre-parsed during load and detected during searches
    CONFIG.DB_SYSTEMS_WITH_SUBSYSTEMS = ['cdi']
    // subdomain > default subsystem not defined below
    CONFIG.DB_SYSTEMS_DEFAULT_SUBSYSTEM = {
        'cdi': 'other',
    }
    // file's path > sybsystem
    CONFIG.DB_PATHS_SUBSYSTEM = {
        'amiga/': 'amiga',
        'atari_st/': 'atari_st',
        'j2me/': 'j2me',
        'gizmondo/': 'gizmondo',
    };

    // subsystem > system
    CONFIG.DB_SUBSYSTEMS_SYSTEM = {
        'other': 'cdi',
        'amiga': 'cdi',
        'atari_st': 'cdi',
        'j2me': 'cdi',
        'gizmondo': 'cdi',
    };

    CONFIG.EXTS_EXTENTIONLESS = '(extensionless)'

    function map_exts(exts) {
        let exts_types = {}

        Object.keys(exts).forEach((type) => {
             exts[type].forEach((ext) => {
                exts_types[ext] = type
            });
        });
        return exts_types;
    }

    function main() {
        let db = new ns_db.Database(CONFIG);
        let pt = new ns_pt.Printer(CONFIG, db);
        let wb = new ns_wb.Web(CONFIG, db, pt);
    }

    main();
})();
