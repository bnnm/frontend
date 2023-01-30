/* main web control and glue */

"use strict";
var ns_wb = new function() {

// helpers
const $_id = (id) => document.getElementById(id);

function Web(cfg, db, pt) {
    let $banana = $_id('banana');
    let $main = $_id('main');

    let $form = $_id('searchform');
    let $ftext = $form['text'];
    let $fsite = $form['site'];
    let $fpage = $form['page'];
    let $fset  = $form['set'];

    let last_target = null;

    // debug features
    $banana.addEventListener('click', (event) => {
        document.body.classList.toggle('banana');
    });

    // tag, pagination
    $main.addEventListener('click', (event) => {
        if (!event.target.matches('[data-site], [data-page], [data-set]'))
            return;
        let ds = event.target.dataset;

        enable_effects(event.target);

        //TODO: call reset function?
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

        update_browser_url();
        submit();

        //TODO: dispatchEvent (no validation), onclick, requestSubmit (no safari)
        //$form.submit();
    });

    // search form
    $form.addEventListener('submit', (event) => {
        //always reset some values when searching via form submit
        $fpage.value = '';
        $fset.value = '';

        update_browser_url();
        submit(true);
        event.preventDefault();
    });

    // history
    window.addEventListener('popstate', (event) => {
        //close_overlay(); //TODO: improve
        document.body.classList.remove('overlayed');
        load_params();
        submit();

        //TODO: not current
        //console.log("pop", event.state, event.state.curr_x, event.state.curr_y);
        //if (event.state)
        //   window.scroll(event.state.curr_x, event.state.curr_y);
    });

    // initial action is to display results
    load_sets();

    function submit(direct_submit) {
        // clicking on set icon = only show set, reading from URL = show both
        let set = $fset.value;
        if (!set || direct_submit)
            show_results();
        if (set)
            submit_current_set();
    }

    function submit_current_set() {
        let setId = $fset.value;

        db.query_set_by_id(setId)
        let set = db.set;
        //if (!set) ???

        db.query_filelist(set.inode)
        if (db.filelist) {
            show_filelist();
        }
        else {
            let url = '';

            if (cfg.WB_USE_EXTERNAL_FILELISTS_SAMEFOLDER)
                url = `${set.url}.json`;
            else if (cfg.WB_USE_EXTERNAL_FILELISTS_SUBFOLDER)
                url = `https://${set.subdomain}.joshw.info/.filelists/${set.name}.json`;
            else // internal
                url = `./filelists/${set.subdomain}/${set.name}.json`;

            // TODO fix_url helper
            if (url.indexOf('%'))
                url = url.replace(/%/g, '%25')
            if (set.url.indexOf('#'))
                url = url.replace(/#/g, '%23')

            if (cfg.WB_FORCE_SET_RELOAD)
                url += '?' + Math.random();
            load_filelist(set, url);
        }
    }

    function enable_effects(target) {
        last_target = null;
        if (!target.matches('[data-set]'))
            return;
        // loading filelist gets an external file and may take a moment, show an spinner

        target.classList.add('spinner');
        last_target = target;
    }

    function disable_effects(target) {
        if (last_target)
            last_target.classList.remove('spinner');
        last_target = null;
    }

    function update_browser_url() {
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

        let url = params.toString();
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

    //TODO promises
    function fetch_data(url, check_loaded, callback) {
        if (check_loaded()) {
            console.log("fetch_data done")
            callback();
            return;
        }

        pt.print_loader();

        // get json with set info
        // could save as localStorage, but some browsers limit max size and if
        // json http cache is properly configured it shouldn't be redownloaded
        fetch(url)
            .then((res) => res.json())
            .then((response) => {
                callback(response);
            })
            .catch((error) => {
                pt.print_error("Couldn't load data :(");
                console.error('Fetch error:', error);
            });
        
    }

    function load_sets() {
        fetch_data(
            cfg.WB_SETS_URL,
            () => {
                return db.has_sets();
            },
            (response) => {
                if (response) //not loaded
                    db.init_index(response);
                load_params();
                //show_results();
                submit(true);
            }
        );
    }

    function load_tags() {
        fetch_data(
            cfg.WB_EXTS_URL,
            () => {
                return db.has_exts();
            },
            (response) => {
                if (response) //not loaded
                    db.init_exts(response);
                load_params();
                //show_results();
                submit(true);
            }
        );
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

        disable_effects();
    }
/*
    function show_tags() {
        //let q = get_query();
        db.query_tags();

        pt.print_tags();
    }
*/

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
        update_browser_url();

        document.removeEventListener('keydown', handle_escape);
    }
}


//export
this.Web = Web;
}
