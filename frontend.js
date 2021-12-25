(function () {
    "use strict";
    const $_id = (id) => document.getElementById(id);
    const $_cl = (node, className) => node.getElementsByClassName(className)[0];
    const SET_FORCE_RELOAD = true;
    const SETS_URL = 'index.json';
    const PAGE_RESULTS = 100;
    const FILELISTS_CACHE_MAX = 300;
    const FILELISTS_EVICT_NUM = 100;
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

    var db;
    var pt;
    var wb;

    //{"size": 123456789, "subdomain": 'xxx', "inode": 123, "name": "(path)/(name)", "modified": "2000-01-01 10:10"},
    class Database {
        constructor() {
            this._sets = [];
            this.query_empty();
        }

        init(sets) {
            this._sets = sets;
            this._setsById = new Map(); //int inode
            this._filelists = new Map(); //same

            this._prepare_sets();
            this.query_empty();
        }
        
        
        
        init_filelist(set, filelist) {
            this._filelists.set(set.inode, filelist);

            // evict older sets to minimize memory (unlikely but...)
            if (this._filelists.size > FILELISTS_CACHE_MAX) {
                let done = 0;
                for (let keyval of this._filelists) {
                    this._filelists.delete(keyval[0]);
                    done += 1;

                    // remove up to N older elems (map is ordered)
                    if (done > FILELISTS_EVICT_NUM)
                        break;
                }
            }

            let crcs = new Set();
            filelist.extensions = [];
            for (let file of filelist.files) {
                this._load_sizeview(file);

                //todo subdomain + amiga > ignore
                let pos = file.name.lastIndexOf('.');
                let ext = '';
                if (pos >= 0)
                    ext = file.name.substring(pos + 1);
                if (!filelist.extensions.includes(ext))
                    filelist.extensions.push(ext);

                if (crcs.has(file.crc))
                    file.dupe = true;
                else
                    crcs.add(file.crc);
            }
        }

        _prepare_sets() {
            this._sets.forEach(set => {
                this._load_basename(set);
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

        _load_inode(set) {
            if (set.basename_lw.endsWith('.7z') || set.basename_lw.endsWith('.zip')) {
                this._setsById.set(set.inode, set);
            }
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
            let size = set.size;
            let type = '';

            if (size < 1000) {
                type = 'B';
            }
            else {
                size = set.size / 1024;
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

        _is_match_term(terms, set) {
            let cmp = set.basename_lw;
            for (let term of terms) {
                if (!term)
                    continue;
                let char0 = term[0]; //todo preload

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
            //TODO improve
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
    
            //let terms = let text = text.split(' ');
            return terms;
        }

        query_search(q) {
            let terms = this._get_terms(q.text)

            if (q.site && !SYSTEM_CONFIG[q.site])
                q.site = '';

            this.subdomains = {};
            this.results = [];
            
            this._sets.forEach(set => {
                let term_ok = this._is_match_term(terms, set);
                let site_ok = this._is_match_site(q.site, set);

                if (term_ok && site_ok) {
                    this.results.push(set);
                }
                
                // adding site_ok will hide other subdomains
                if (term_ok /*&& site_ok*/ || q.showRecent) {
                    this._load_subdomain(set);
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

        _load_subdomain(set) {
            let sd = set.subdomain
            if (!this.subdomains[sd])
                this.subdomains[sd] = 0;
            this.subdomains[sd] += 1;
        }
    }


    function Printer() {
        let $content = $_id('content');
        let $form = $_id('searchform');
        let $fsite = $form['site'];
        let $fpage = $form['page'];

        var tpl_results_recent = $_id('tpl-results-recent');
        var tpl_results_search = $_id('tpl-results-search');
        var tpl_systems = $_id('tpl-systems');
        var tpl_system = $_id('tpl-system');
        var tpl_urls = $_id('tpl-urls');
        var tpl_url = $_id('tpl-url');
        var tpl_date = $_id('tpl-date');
        var tpl_pagination = $_id('tpl-pagination');
        var tpl_page_number = $_id('tpl-page-number');
        var tpl_page_prev = $_id('tpl-page-prev');
        var tpl_page_next = $_id('tpl-page-next');
        var tpl_page_more = $_id('tpl-page-more');
        var tpl_filelist = $_id('tpl-filelist');
        var tpl_filelist_main = $_id('tpl-filelist-main');
        var tpl_filelist_info = $_id('tpl-filelist-info');
        var tpl_filelist_item = $_id('tpl-filelist-item');
        var tpl_filelist_ext = $_id('tpl-filelist-ext');
        var tpl_filelist_type = $_id('tpl-filelist-type');
        var tpl_filelist_error = $_id('tpl-filelist-error');

        function get_node(tpl) {
            let $node = tpl.cloneNode(true);
            $node.removeAttribute('id');
            return $node;
        }

        function get_blank() {
            return document.createTextNode(' ');
        }

        function clean_content() {
            //$content.innerHTML = '';
            // faster/cleaner?
            var $content_new = $content.cloneNode(false);
            $content.parentNode.replaceChild($content_new, $content);
            $content = $content_new;
        }

        function clean_overlay() {
            let $overlay = document.getElementById('overlay');
            if ($overlay)
                $overlay.remove();
        }

        function get_page(sets) {
            let page = $fpage.value || 0;
            try {
                page = parseInt(page, 10);
                page -= 1;
                if (page < 0)
                    page = 0;

                // clamp max page
                let pages = parseInt(sets.length / PAGE_RESULTS, 10) + 1;
                if (page >= pages)
                    page = pages - 1;

            } catch(error) {
                page = 0;
            }

            return page;
        }

        function print_page_common($results, separator) {
            let $systems = get_node(tpl_systems);
            let $urls = get_node(tpl_urls);
            let $pagination = get_node(tpl_pagination);

            let sets = db.results;
            let sites =  db.subdomains;
            let page = get_page(sets);

            fill_results_search($results, sets);
            fill_systems($systems, sites);
            fill_urls($urls, sets, page, separator);
            fill_pagination($pagination, sets, page);

            clean_content();
            $content.appendChild($results);
            $content.appendChild($systems);
            $content.appendChild($urls);
            $content.appendChild($pagination);
        }

        this.print_recent = function () {
            let $results = get_node(tpl_results_recent);
            print_page_common($results, true);
        }

        this.print_search = function () {
            let $results = get_node(tpl_results_search);
            print_page_common($results, false);
        }

        this.print_filelist = function () {
            let $filelist = get_node(tpl_filelist);
            $filelist.id = 'overlay';

            fill_filelist($filelist, db.set, db.filelist);

            clean_overlay();
            $content.appendChild($filelist);
        }

        function fill_results_search($results, results) {
            let $texts = $results.getElementsByClassName('text');
            if ($texts.length == 0)
                return;
            let $text = $texts[0];
            $text.textContent = results.length;
        }

        function fill_systems($block, subdomains) {
            let current = $fsite.value;
            Object.entries(subdomains)   // [key,val] array
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
                    if (current == subdomain)
                        $system.classList.add('selected');

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

                let $set = $url.getElementsByClassName('showset')[0];
                if (set.inode) {
                    $set.dataset.set = set.inode;
                } else {
                    $set.remove();
                }

                $block.appendChild($url);
            }
        }
       
        function fill_pagination($block, sets, page) {
            let total = sets.length;
            let pages = parseInt(total / PAGE_RESULTS, 10) + 1;

            if (pages == 1)
                return;


            let $prev = get_node(tpl_page_prev);
            $prev.dataset.page = page + 1 - 1;
            $prev.classList.toggle('disabled', page < 1);
            $block.appendChild($prev);

            let limit = pages;
            if (limit > 10)
                limit = 10;

            for (let i = 0; i < limit; i++) {
                let $number = get_node(tpl_page_number);
                $number.dataset.page = i + 1;
                $number.textContent = i + 1;
                $number.classList.toggle('selected', i == page);

                $block.appendChild($number);
            }

            if (pages > limit && page > limit) {
                let $more = get_node(tpl_page_more);

                $block.appendChild($more);
            }

            if (page >= limit) {
                let $number = get_node(tpl_page_number);
                $number.dataset.page = page + 1;
                $number.textContent = page + 1;
                $number.classList.add('selected');

                $block.appendChild($number);
            }

            if (pages > limit && page + 1 < pages) {
                let $more = get_node(tpl_page_more);
                $block.appendChild($more);
            }

            let $next = get_node(tpl_page_next);
            $next.dataset.page = page + 1 + 1;
            $next.classList.toggle('disabled', page + 1 >= pages);
            $block.appendChild($next);
        }

        // {"type": "7z", "size": 1213797, "method": "LZMA2:1536k", "solid": true, "files": [
        //   {"name": "name.ext", "size": 123, "time": "2011-06-03 05:40:56", "crc": "F5E2CDC0"}, 
        // ]
        function fill_filelist($block, set, filelist) {
            let $main = get_node(tpl_filelist_main);

            let $link = $main.getElementsByTagName('a')[0];
            $link.href = set.url;
            $link.textContent = set.basename;

            let $info = $main.getElementsByClassName('info')[0];
            $info.textContent = `${set.sizeview} ${set.modified}`;

            if (!filelist) {
                let $error = get_node(tpl_filelist_error);
                $main.appendChild($error);
            }
            else {
                let $info = get_node(tpl_filelist_info);
                
                let $extensions = $info.getElementsByClassName('extensions')[0];
                let extensions = filelist.extensions;
                for (let extension of extensions) {
                    let $ext = get_node(tpl_filelist_ext);
                    $ext.textContent = `${extension}`
                    $extensions.appendChild($ext);
                }

                let $types = $_cl($info, 'types');
                let $type = get_node(tpl_filelist_type);

                if (filelist.solid === undefined) {
                    $type.textContent = `zip`;
                } else if (filelist.solid) {
                    $type.textContent = "7z / solid";
                    $type.classList.add('solid');
                } else {
                    $type.textContent = "7z / non-solid";
                    $type.classList.add('nonsolid');
                }
                if (filelist.method)
                    $type.title = `Method: ${filelist.method}`;
                $types.appendChild($type);


                let $total = $info.getElementsByClassName('total')[0];
                $total.textContent = `${filelist.files.length}`;

                let $list = $info.getElementsByTagName('ul')[0];
                for (let file of filelist.files) {
                    let $item = get_node(tpl_filelist_item);
                    let $name = $item.getElementsByClassName('name')[0];
                    let $info = $item.getElementsByClassName('info')[0];

                    $name.textContent = `${file.name}`;
                    $info.textContent = `${file.sizeview}`;

                    if (file.dupe)
                       $item.classList.add('dupe');
                    $list.appendChild($item);
                }
                $main.appendChild($info);
            }

            $block.appendChild($main);
        }
    }

    function Web() {
        let $banana = $_id('banana');
        let $main = $_id('main');
        let $form = $_id('searchform');
        let $ftext = $form['text'];
        let $fsite = $form['site'];
        let $fpage = $form['page'];
        let $fset  = $form['set'];
        let self = this;

        // testing
        $banana.addEventListener('click', (event) => {
            document.body.classList.toggle('banana')
        });

        // tag, pagination
        $main.addEventListener('click', (event) => {
            if (!event.target.matches('[data-site], [data-page], [data-set]'))
                return;
            let ds = event.target.dataset;

            //todo call reset function
            $fset.value = '';

            let site = ds.site;
            if (site !== undefined) {
                if (site === $fsite.value)
                    site = '';
                $fpage.value = '';
                $fsite.value = site;
            }

            let page = ds.page;
            if (page !== undefined) {
                $fpage.value = page;
                window.scroll(0,0);
            }

            let set = ds.set;
            if (set !== undefined) {
                $fset.value = set;
            }

            update_url();
            submit();
            //$form.submit() //todo dispatchEvent (no validation), onclick, requestSubmit (no safari)
        });

        // search form
        $form.addEventListener('submit', (event) => {
            //always reset some values when searching via form submit
            $fpage.value = '';
            $fset.value = '';

            update_url();
            submit(true);
            event.preventDefault();
        });

        window.addEventListener('popstate', (event) => {
            //close_overlay(); //todo improve
            document.body.classList.remove('overlayed');
            load_params();
            submit();

            //TODO not current
            //console.log("pop", event.state, event.state.curr_x, event.state.curr_y);
            //if (event.state)
            //   window.scroll(event.state.curr_x, event.state.curr_y);
        });


        load_sets();

        function submit(direct_submit) {
            // clicking on set icon = only show set, reading from URL = show both
            let set = $fset.value;
            if (!set || direct_submit)
                show_results();
            if (set)
                submit_set();
        }

        function submit_set() {
            let setId = $fset.value;

            db.query_set_by_id(setId)
            let set = db.set;
            //if (!set) ???

            db.query_filelist(set.inode)
            if (db.filelist) {
                show_filelist();
            }
            else {
                let url = `./filelists/${set.subdomain}/${set.name}.json`;
                if (SET_FORCE_RELOAD)
                    url += '?' + Math.random();
                load_filelist(set, url);
            }
        }
        
        function update_url() {
            let data = new FormData($form)
            let params = new URLSearchParams(data);

            // clean empty params (with a copy)
            [...params.entries()].forEach(([key, value]) => {
                if (!value) //0 or ''
                    params.delete(key);
            });

            let state = {
                //curr_x: 0, //window.pageXOffset,
                //curr_y: document.body.offsetTop //window.pageYOffset,
            }

            let url = params.toString()
            url = `?${url}`; //force '?'
            history.pushState(state, null, url);
        }

        function load_params() {
            //$form.reset(); //no good in hidden fields
            $ftext.value = '';
            $fsite.value = '';
            $fpage.value = '';
            $fset.value = '';

            if (location.search) {
                let params = new URLSearchParams(location.search);
                for (let p of params.keys()) {
                    if ($form[p])
                        $form[p].value = params.get(p);
                }
            }
        }

        function load_sets() {
            // get json with set info
            // could save as localStorage, but some browsers limit max size and if
            // json http cache is properly configured it shouldn't be redownloaded
            fetch(SETS_URL)
                .then((res) => res.json())
                .then((response) => {
                    db.init(response);
                    load_params();
                    //show_results();
                    submit(true);
                })
                .catch((error) => {
                    console.error('Error:', error);
                });
        }

        function load_filelist(set, url) {
            // get json with single set info
            fetch(url)
                .then((res) => res.json())
                .then((response) => {
                    db.init_filelist(set, response);
                    show_filelist();
                })
                .catch((error) => {
                    // bad response/no file
                    //console.error('Error:', error);
                    show_filelist();
                });
        }
        
        function get_query() {
            let q = {
                text: $ftext.value,
                site: $fsite.value,
                showRecent: false,
            }

            if (!q.text)
                q.showRecent = true;
            return q;
        }

        function show_results() {
            let q = get_query();
            db.query_search(q);

            if (q.showRecent)
                pt.print_recent();
            else
                pt.print_search();
        }

        function show_filelist() {
            let q = $fset.value;
            db.query_filelist(q);

            pt.print_filelist();
            
            open_overlay();
        }


        function open_overlay() {
            let $overlay = $_id('overlay');

            document.body.classList.add('overlayed');
            $overlay.addEventListener('click', (event) => {
                if (!event.target.matches('.filelist-back'))
                    return;
                close_overlay();
            });

            document.addEventListener('keydown', handle_escape);
            $overlay.addEventListener('click', (event) => {
                if (!event.target.matches('.filelist'))
                    return;
                close_overlay();
            });
        }

        function handle_escape(event) {
            if (event.key === "Escape" || event.key === "Esc") {
                close_overlay();
            }
        }

        function close_overlay() {
            let $overlay = $_id('overlay');
            if (!$overlay)
                return;

            document.body.classList.remove('overlayed');
            $overlay.remove();
            $fset.value = '';
            update_url();

            document.removeEventListener('keydown', handle_escape);
        }
    }

    function main() {
        db = new Database();
        pt = new Printer();
        wb = new Web();
    }

    main()
})();
