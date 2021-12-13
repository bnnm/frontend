(function() {
    "use strict";
    const DB_STATE_KEY = 'joshw_frontend_state_v1';
    const DB_STATE_MAXTIME_MS = 60 * 60 * 1000;
    const URL = 'index.json';
    const PAGE_RESULTS = 100;

    const SYSTEM_CONFIG = {
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
        'cdi': "Other systems",
        'switch': "Switch"
    }

    var ld;
    var db;
    var pt;
    var wb;

    class Loader {
        constructor() {
        }
        
        setup() {
            //let state = localStorage.getItem(DB_STATE_KEY);
            //db.load(state)
            //if (db.is_old())

            this.load_ajax();
        }

        load_ajax() {
            fetch(URL)
                .then(res => res.json())
                .then(response => {
                    db.init(response);
                    //todo promise?
                    let state = db.save();
                    //TODO: too large to store? not too important with browser CDN cache
                    //localStorage.setItem(DB_STATE_KEY, state);

                    wb.show_recent();
                })
                .catch(error => {
                    console.error('Error:', error)
                });
        }
    }

    //{"size": 123456789, "subdomain": 'xxx', "inode": 123, "name": "(path)/(name)", "modified": "2000-01-01 10:10"},
    class Database {
        constructor() {
            this._modified = null;
            this._sets = [];
            this.query_empty();
        }

        init(sets) {
            this._modified = Date.now();
            this._sets = sets;

            this._prepare_sets();
            this.query_empty();
        }
        
        load(state) {
            if (!state) {
                return;
            }
            console.log("DB: loading state");
            state = JSON.parse(state);
            this._modified = state.modified
            this._sets = state.sets;

            //sets should be prepared
            this.query_empty();
        }

        is_old()  {
            //TODO: too test 
            if (this._modified == null) {
                console.log("DB: no state found");
                return true;
            }
            
            let diff = Date.now() - this._modified;
            if (diff > DB_STATE_MAXTIME_MS) {
                return true;
            }

            return false;
        }

        save() {
            let state = {
                modified: this._modified,
                sets: this._sets
            };
            return JSON.stringify(state)
        }

        _load_basename(set) {
            let basename = set.name;
            let index = basename.lastIndexOf('/');
            if (index)
                basename = basename.substring(index + 1);
            set.basename = basename;
            set.basename_lw = basename.toLowerCase();
        }

        _load_sizeview(set) {
            let size = set.size / 1024; // default in KB
            let type = '';

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
            set.sizeview = `${size}${type}`;
        }

        _load_url(set) {
            
            set.url = `https://${set.subdomain}.joshw.info/${set.name}`;
            if (set.url.indexOf('#')) 
                set.url = set.url.replaceAll('#', '%23')
        }
        
        _load_date(set) {
            let date = set.modified;
            let index = date.indexOf(' ');
            if (index)
                date = date.substring(0, index);
            set.date = date;
        }

        _prepare_sets() {
            this._sets.forEach(set => {
                this._load_basename(set);
                this._load_sizeview(set);
                this._load_url(set);
                this._load_date(set);
            });
        }

        query_empty() {
            this.results = [];
            this.subdomains = {};
        }

        query_recent() {
            this.results = this._sets;
            this.subdomains = {};

            this._sets.forEach(set => {
                this._load_subdomain(set);
            });

            this._sort_results(true);
            this._sort_subdomains();
        }

        _is_match(terms, set) {
            //TODO: partial matches, search term too short, etc

            let cmp = set.basename_lw;
            for (let i = 0; i < terms.length; i++) {
                let term = terms[i];
                if (!term)
                    continue;

                let char0 = term.charAt(0); //todo preload

                if (char0 == '^') {
                    if (!cmp.startsWith(term.substring(1)))
                        return false
                    continue;
                }

                if (char0 == '-') {
                    if (cmp.indexOf(term.substring(1)) >= 0)
                        return false
                    continue;
                }

                // AND search, unlike original OR
                if (cmp.indexOf(term) < 0)
                    return false;
            }

            return true;
        }
        
        _get_terms(text) {
            text = text.toLowerCase()
            //todo
            let terms = text.match(/\\?.|^$/g).reduce((p, c) => {
                    if (c === '"') {
                        p.quote ^= 1;
                    } else if(!p.quote && c === ' ') {
                        p.a.push('');
                    } else {
                        p.a[p.a.length-1] += c.replace(/\\(.)/,"$1");
                    }
                    return  p;
                }, {a: ['']}).a;
            
            console.log(terms)
    
            //let terms = let text = text.split(' ');
            return terms;
            
        }

        query_search(text) {
            let terms = this._get_terms(text)

            this.results = [];
            this.subdomains = {};

            this._sets.forEach(set => {
                if (!this._is_match(terms, set))
                    return;
                this.results.push(set);
                this._load_subdomain(set);
            });


            this._sort_results(false);
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
            Object.entries(this.subdomains)   // [key,val] array
                .sort((a, b) => {
                    return b[1] - a[1];     //sort by value (total sets)
            });
        }

        _load_subdomain(set) {
            let sd = set.subdomain
            if (!this.subdomains[sd])
                this.subdomains[sd] = 0;
            this.subdomains[sd] += 1;
        }
    }


    function Printer() {
        var $content = document.getElementById('content');

        var tpl_results_recent = document.getElementById('tpl-results-recent');
        var tpl_results_search = document.getElementById('tpl-results-search');
        var tpl_systems = document.getElementById('tpl-systems');
        var tpl_system = document.getElementById('tpl-system');
        var tpl_urls = document.getElementById('tpl-urls');
        var tpl_url = document.getElementById('tpl-url');
        var tpl_date = document.getElementById('tpl-date');
        var tpl_pagination = document.getElementById('tpl-pagination');

        function get_node(tpl) {
            let $node = tpl.cloneNode(true);
            $node.removeAttribute('id');
            return $node;
        }

        function get_blank() {
            return document.createTextNode(' ');
        }

        function clean_page() {
            //$content.innerHTML = '';
            // faster/cleaner?
            var $content_new = $content.cloneNode(false);
            $content.parentNode.replaceChild($content_new, $content);
            $content = $content_new;
        }


        function print_page_common($results, separator) {
            let $systems = get_node(tpl_systems);
            let $urls = get_node(tpl_urls);
            let $pagination = get_node(tpl_pagination);
            
            let page = 0;

            fill_results_search($results, db.results);
            fill_systems($systems, db.subdomains);
            fill_urls($urls, db.results, page, separator);
            fill_pagination($pagination, db.results, page);

            clean_page();
            $content.appendChild($results);
            $content.appendChild($systems);
            $content.appendChild($urls);
            $content.appendChild($pagination);
        }

        this.print_recent = function() {
            let $results = get_node(tpl_results_recent);
            print_page_common($results, true);
            /*
            fill_systems($systems, db.subdomains);
            fill_urls($urls, db.results, 0, separation);

            clean_page();
            $content.appendChild($results);
            $content.appendChild($systems);
            $content.appendChild($urls);
            */
        }

        this.print_search = function() {
            let $results = get_node(tpl_results_search);
            print_page_common($results, false);
            return;
            /*
            let $results = get_node(tpl_results_search);
            let $systems = get_node(tpl_systems);
            let $urls = get_node(tpl_urls);
            let $pagination = get_node(tpl_pagination);

            fill_results_search($results, db.results);
            fill_systems($systems, db.subdomains);
            fill_urls($urls, db.results, 0);

            clean_page();
            $content.appendChild($results);
            $content.appendChild($systems);
            $content.appendChild($urls);
            */
        }

        function fill_results_search($results, results) {
            let $texts = $results.getElementsByClassName('text');
            if ($texts.length == 0)
                return;
            let $text = $texts[0];
            $text.textContent = results.length;
        }

        function fill_systems($block, subdomains) {
            Object.entries(db.subdomains)   // [key,val] array
                .sort((a, b) => {
                    return b[1] - a[1];     //sort by value (total sets)
                })
                .forEach(element => {
                    let $system = get_node(tpl_system);
                    let $blank = get_blank();
                    let subdomain = element[0];
                    let total = element[1];

                    let sysname = SYSTEM_CONFIG[subdomain] || subdomain;

                    $system.dataset.site = subdomain;
                    $system.textContent = sysname + ' · ' + total;

                    $block.appendChild($system);
                    $block.appendChild($blank); //nowrap oddities
                }
            );
        }

        function fill_urls($block, sets, page, separator) {

            let curr = page * PAGE_RESULTS;
            let max = curr + PAGE_RESULTS
            if (max > sets.length)
                max = sets.length;


            let curr_date = null;
            for (let i = curr; i < max; i++) {
                let set = sets[i];
                let $url = get_node(tpl_url);
                
                if (separator && curr_date != set.date) {
                    curr_date = set.date;
                    let $date = get_node(tpl_date);
                    let $text = $date.getElementsByClassName('text')[0];
                    $text.textContent = curr_date;

                    $block.appendChild($date);
                }

                let $link = $url.getElementsByTagName('a')[0];
                $link.href = set.url;
                $link.textContent = set.basename;

                let sysname = SYSTEM_CONFIG[set.subdomain] || set.subdomain;
                let $system = $url.getElementsByClassName('sitetag')[0];
                $system.dataset.site = set.subdomain;
                $system.textContent = sysname;

                let $info = $url.getElementsByClassName('info')[0];
                $info.textContent = `${set.sizeview} ${set.modified}`;

                $block.appendChild($url);
            }
        }
        
        function fill_pagination($block, sets, page) {
            if (sets.length > PAGE_RESULTS)
                $block.textContent = `... (total ${sets.length})`;
        }

    }

    function Web() {
        //add button functions
        var $form = document.getElementById('searchform');
        
        $form.addEventListener("submit", e => {
            e.preventDefault()

            this.show_search();
        });
        ld.setup();
        
        
        this.show_recent = function() {
            db.query_recent();
            pt.print_recent();
        }
        
        this.show_search = function() {
            var text = $form['search'].value;
            if (!text) {
                this.show_recent();
                return;
            }

            db.query_search(text);
            pt.print_search();
        }
    }

    function main() {
        ld = new Loader();
        db = new Database();
        pt = new Printer();
        wb = new Web();
    }

    main()
})();
