/* receives data lists and handles queries */

"use strict";
var ns_db = new function() {

// index item example:
//{"size": 123456789, "subdomain": 'xxx', "inode": 123, "name": "(path)/(name)", "modified": "2000-01-01 10:10"},

class Database {

    constructor(cfg) {
        this._cfg = cfg;
        this._sets = [];
        this._exts = {};
        this.query_empty();
    }

    // setup index .json
    init_index(sets) {
        this._sets = sets;
        this._setsById = new Map(); //int inode
        this._filelists = new Map(); //same

        new DataSetup(this._cfg, this._sets, this._setsById).prepare();
        this.query_empty();
    }

    // setup exts .json
    init_exts(sets) {
        this._exts = exts;

        //new ExtsSetup(this._cfg, this_exts).prepare();
        this.query_empty();
    }

    // setup single filelist .json
    init_filelist(set, filelist) {
        let cfg = this._cfg;

        this._filelists.set(set.inode, filelist);

        // evict older sets to minimize memory (unlikely but...)
        if (this._filelists.size > cfg.DB_FILELISTS_CACHE_MAX) {
            let done = 0;
            for (let keyval of this._filelists) {
                this._filelists.delete(keyval[0]);
                done += 1;

                // remove up to N older elems (map is ordered)
                if (done > this._cfg.DB_FILELISTS_EVICT_NUM)
                    break;
            }
        }

        new FilelistSetup(cfg, set, filelist).prepare();
    }

    //*********************************************************************
    // helpers
    
    has_sets() {
        return this._sets.length;
    }

    has_exts() {
        return Object.keys(this._exts).length 
    }


    //*********************************************************************
    // query

    query_empty() {
        this.results = [];
        this.subdomains = {};
        this.set = null;
        this.filelist = null;
    }

    _clean_id(id) {
        try {
            return parseInt(id);
        } catch(error) {
            return 0;
        }
    }

    query_set_by_id(id) {
        id = this._clean_id(id);
        this.set = this._setsById.get(id) || null;
    }

    query_filelist(id) {
        id = this._clean_id(id);
        this.filelist = this._filelists.get(id) || null;
    }

    _is_match_terms(terms, set) {
        let cmp = set.basename_lw;
        for (let term of terms) {
            if (!term)
                continue;
            let char0 = term[0]; //TODO: preload

            if (char0 == '^' && term.length > 1) {
                if (!cmp.startsWith(term.substring(1)))
                    return false
                continue;
            }

            if (char0 == '-' && term.length > 1) {
                if (cmp.includes(term.substring(1)))
                    return false
                continue;
            }

            if (char0 == ':' && term.length > 1) {
                try {
                    // maybe should replace single \ to \\ for easier escaping
                    if (!cmp.match(term.substring(1)))
                        return false
                    continue;
                }
                catch(e) {
                    return false;
                }
            }

            // AND search, unlike original OR, and always partial matches
            if (!cmp.includes(term))
                return false;
        }

        return true;
    }

    _is_match_site(site, set) {
        if (site) {
            if (set.subdomain != site)
                return false;
        }

        return true;
    }

    _get_terms(text) {
        text = text.toLowerCase()

        // convert text into an array
        let terms = text.match(/\\?.|^$/g).reduce((accu, curr) => {
                if (curr === '"') {
                    accu.quote ^= 1;
                } else if(!accu.quote && curr === ' ') {
                    accu.out.push('');
                } else {
                    accu.out[accu.out.length - 1] += curr.replace(/\\(.)/, "$1");
                }
                return accu;
            }, {out: ['']}
        ).out;

        //TODO improve and pre-convert to objects

        //let terms = {}
        //terms.values = terms;

        return terms;
    }

    query_search(q) {
        let cfg = this._cfg;
        let terms = this._get_terms(q.text)

        if (q.site && cfg.DB_SYSTEMS.indexOf(q.site) < 0) //!cfg.DB_SYSTEM_CONFIG[q.site])
            q.site = '';

        this.subdomains = {};
        this.results = [];

        this._sets.forEach(set => {
            if (set.disabled)
                return;

            let term_ok = this._is_match_terms(terms, set);
            let site_ok = this._is_match_site(q.site, set);

            if (term_ok && site_ok) {
                this.results.push(set);
            }

            // adding site_ok will hide other subdomains
            if (term_ok /*&& site_ok*/ || q.showRecent) {
                this._include_subdomain(set);
            }
        });

        // should always include current (if it's an actual system)
        if (q.site && !this.subdomains[q.site])
            this.subdomains[q.site] = 0;

        this._sort_results(q.showRecent);
        this._sort_subdomains();
    }

    _sort_results(by_date) {
        this.results.sort((a, b) => {
            if (by_date) {
                if (a.modified > b.modified) return -1;
                if (a.modified < b.modified) return 1;
                // on equals use name
            }
            if (a.basename < b.basename) return -1;
            if (a.basename > b.basename) return 1;
            return 0;
        });
    }

    _sort_subdomains() {
        //done by view
        //this.subdomains.sort((a, b) => b[1] - a[1]);

        //Object.entries(this.subdomains)   // [key,val] array
        //    .sort((a, b) => {
        //        return b[1] - a[1];     //sort by value (total sets)
        //});
    }

    _include_subdomain(set) {
        let sd = set.subdomain
        if (!this.subdomains[sd])
            this.subdomains[sd] = 0;
        this.subdomains[sd] += 1;
    }
}

// prepares index list for queries
class DataSetup {
    constructor(cfg, sets, setsById) {
        this._cfg = cfg;
        this._sets = sets;
        this._setsById = setsById;
    }

    prepare() {
        this._sets.forEach(set => {
            // tweak original json info
            this._load_basename(set);
            this._load_subdomain(set);
            this._load_inode(set);
            this._load_sizeview(set);
            this._load_url(set);
            this._load_date(set);

            // input JSON is untrusted data, but we manually control href's start (always http... so "javascript:..."
            // isn't possible), and all text is written with textContent and not innerHTML (can't trigger scripts),
            // thus should be safe to use strings as-is without XSS (hopefully)
            //this._escape(set);
        });
    }
    
    _load_basename(set) {
        if (set.nm) { // short name
            set.name = set.nm;
            delete set.nm;
        }

        let basename = set.name;
        let index = basename.lastIndexOf('/');
        if (index)
            basename = basename.substring(index + 1);
        set.basename = basename;
        set.basename_lw = basename.toLowerCase();

        if (basename.endsWith('.json'))
            set.disabled = true;
    }

    _load_subdomain(set) {
        if (set.sd) { // short name
            set.subdomain = set.sd;
            delete set.sd;
        }
    }

    _load_inode(set) {
        if (set.id) { // short name
            set.inode = set.id;
            delete set.id;
        }

        //DB_EXTS_ARCHIVE
        if (set.basename_lw.endsWith('.7z') || set.basename_lw.endsWith('.zip')) {
            this._setsById.set(set.inode, set);
            set.archive = true;
        }
        else {
            set.archive = false;
        }
    }

    _load_sizeview(set) {
        if (set.sz) { // short name
            set.size = set.sz;
            delete set.sz;
        }
        set.sizeview = get_sizetype(set.size);
    }

    _load_url(set) {
        set.url = `https://${set.subdomain}.joshw.info/${set.name}`;
        if (set.url.indexOf('%'))
            set.url = set.url.replace(/%/g, '%25')
        if (set.url.indexOf('#'))
            set.url = set.url.replace(/#/g, '%23')
    }

    _load_date(set) {
        if (set.md) { // short name
            set.modified = set.md;
            delete set.md;
        }

        let date = set.modified;
        let index = date.indexOf(' ');
        if (index)
            date = date.substring(0, index);
        set.date = date;
    }
}


function get_sizetype(sizebytes) {
    let size = sizebytes;
    let type = '';

    if (size < 1000) {
        type = 'B';
    }
    else {
        size = size / 1024;
        if (size < 1000) {
            type = 'KB';
        }
        else {
            size = size / 1024;
            if (size < 1000) {
                type = 'MB';
            }
            else {
                size = size / 1024;
                type = 'GB';
            }
        }
        size = size.toFixed(2);
    }

    return `${size}${type}`;
}


class FilelistSetup {
    constructor(cfg, set, filelist) {
        this._cfg = cfg;
        this._set = set;
        this._filelist = filelist;
    }
    
    prepare() {
        let cfg = this._cfg;
        let set = this._set;
        let filelist = this._filelist;

        let crcs = new Set();
        filelist.extensions = [];
        for (let file of filelist.files) {
            this._load_sizeview(file);

            if (file.crc && crcs.has(file.crc))
                file.dupe = true;
            else
                crcs.add(file.crc);

            if (!file.dir) {
                let dirpos = file.name.lastIndexOf("/");
                if (dirpos >= 0) {
                    file.dir = file.name.substring(0, dirpos + 1);
                    file.name = file.name.substring(dirpos + 1);
                }
            }
            // after loading dir/name
            let ext = this._extract_ext(set, file);
            if (!filelist.extensions.includes(ext))
                filelist.extensions.push(ext);
            if (cfg.DB_EXTS_LESSER.includes(ext))
                file.lesser = true;
        }

        filelist.files.sort((a, b) => {
            if (a.dir === undefined)
                return -1;
            else if (b.dir === undefined)
                return 1;
            let dir_cmp = a.dir.localeCompare(b.dir, 'en', { sensitivity:'base' });
            let file_cmp = a.name.localeCompare(b.name, 'en', { sensitivity:'base' });
            return dir_cmp || file_cmp;
        });
    }


    _load_sizeview(file) {
        file.sizeview = get_sizetype(file.size)
    }

    // detect extension from a filename
    _extract_ext(set, file) {
        let cfg = this._cfg;
        let ext = ''; // extensionless by default
        let name = file.name;

        let is_reversed = set.subdomain == cfg.DB_REVERSED_SYSTEM && set.basename_lw.includes(cfg.DB_REVERSED_TAG_LW);
        if (!is_reversed) {
            // regular sets use file.ext (or just .file)
            let pos = name.lastIndexOf('.');
            if (pos >= 0)
                ext = name.substring(pos + 1);

        } else {
            // amiga sets may have "file.ext" or "ext.file" format, try to autodetect
            // - known extension: use that (needs a known list as sets may mix normal and reverse exts)
            // - no known extension: use smaller one (not always correct as "01.ext"<>"ext.01", "smp.dig",
            //   "mod.v1.1" may exist, so the known list is preferable)
            let name_lw = file.name.toLowerCase();

            let ext_frst = '';
            let pos_frst = name_lw.indexOf('.');
            if (pos_frst >= 0)
                ext_frst = name_lw.substring(0, pos_frst);

            let ext_last = '';
            let pos_last = name_lw.lastIndexOf('.');
            if (pos_last >= 0)
                ext_last = name_lw.substring(pos_last + 1);

            if (cfg.DB_REVERSED_EXTS.includes(ext_frst)) {
                ext = ext_frst;
            } else if (cfg.DB_REVERSED_EXTS.includes(ext_last)) {
                ext = ext_last;
            } else {
                if (ext_frst && ext_frst.length <= ext_last.length)
                    ext = ext_frst;
                else
                    ext = ext_last;
            }
        }

        return ext;
    }
}


//export
this.Database = Database;
};
