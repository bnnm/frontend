/* prints DOM/pages and dabatase results */

"use strict";
var ns_pt = new function() {

// helpers
const $_id = (id) => document.getElementById(id);
const $_cl = (node, className) => node.getElementsByClassName(className)[0];


function Templates() {
    this.results_recent = $_id('tpl-results-recent');
    this.results_search = $_id('tpl-results-search');
    this.systems = $_id('tpl-systems');
    this.system = $_id('tpl-system');
    this.urls = $_id('tpl-urls');
    this.url = $_id('tpl-url');
    this.separator = $_id('tpl-separator');
    this.pagination = $_id('tpl-pagination');
    this.page_number = $_id('tpl-page-number');
    this.page_prev = $_id('tpl-page-prev');
    this.page_next = $_id('tpl-page-next');
    this.page_more = $_id('tpl-page-more');
    this.filelist = $_id('tpl-filelist');
    this.filelist_main = $_id('tpl-filelist-main');
    this.filelist_info = $_id('tpl-filelist-info');
    this.filelist_item = $_id('tpl-filelist-item');
    this.filelist_ext = $_id('tpl-filelist-ext');
    this.filelist_type = $_id('tpl-filelist-type');
    this.filelist_error = $_id('tpl-filelist-error');
    this.loading = $_id('tpl-loading');
    this.error_text = $_id('tpl-error-text');

    this.get = function(tpl) {
        let $node = tpl.cloneNode(true);
        $node.removeAttribute('id');
        return $node;
    }
}


function Printer(cfg, db) {
    let $content = $_id('content');
    let $form = $_id('searchform');
    let $fsite = $form['site'];
    let $fpage = $form['page'];
    const tpl = new Templates();
    
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
            let pages = parseInt(sets.length / cfg.PT_PAGE_RESULTS, 10) + 1;
            if (page >= pages)
                page = pages - 1;

        } catch(error) {
            page = 0;
        }

        return page;
    }

    function print_page_common($results, separator) {
        let $systems = tpl.get(tpl.systems);
        let $urls = tpl.get(tpl.urls);
        let $pagination = tpl.get(tpl.pagination);

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

    this.print_loader = function ()  {
        let $results = tpl.get(tpl.results_recent);
        let $loading = tpl.get(tpl.loading);

        // results header + spinner, delayed a bit to look like it's doing something
        $results.classList.add('info-loader')
        $content.appendChild($results);
        $content.appendChild($loading);
        // should be deleted when printing
    }

    this.print_recent = function () {
        let $results = tpl.get(tpl.results_recent);
        print_page_common($results, true);
    }

    this.print_search = function () {
        let $results = tpl.get(tpl.results_search);
        print_page_common($results, false);
    }

    this.print_filelist = function () {
        let $filelist = tpl.get(tpl.filelist);
        $filelist.id = 'overlay';

        fill_filelist($filelist, db.set, db.filelist);

        clean_overlay();
        $content.appendChild($filelist);
    }
   
    this.print_error = function (msg) {
        let $error = tpl.get(tpl.error_text);
        
        clean_content();
        $error.textContent = msg;
        $content.appendChild($error);
    }

    
    
    ///////////////////////////////////////////////////////////////////////////

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
                let $system = tpl.get(tpl.system);
                let $blank = get_blank();
                let subdomain = element[0];
                let total = element[1];

                let sysname = cfg.PT_SYSTEM_CONFIG[subdomain] || subdomain;

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
        let curr = page * cfg.PT_PAGE_RESULTS;
        let max = curr + cfg.PT_PAGE_RESULTS
        if (max > sets.length)
            max = sets.length;


        let curr_date = null;
        for (let i = curr; i < max; i++) {
            let set = sets[i];
            let $url = tpl.get(tpl.url);

            if (separator && curr_date != set.date) {
                curr_date = set.date;
                let $separator = tpl.get(tpl.separator);
                let $text = $separator.getElementsByClassName('text')[0];
                $text.textContent = curr_date;

                $block.appendChild($separator);
            }

            let $link = $url.getElementsByTagName('a')[0];
            $link.href = set.url;
            $link.textContent = set.basename;

            let sysname = cfg.PT_SYSTEM_CONFIG[set.subdomain] || set.subdomain;
            let $system = $url.getElementsByClassName('sitetag')[0];
            $system.dataset.site = set.subdomain;
            $system.textContent = sysname;

            let $info = $url.getElementsByClassName('info')[0];
            $info.textContent = `${set.sizeview}`;

            let $date = $url.getElementsByClassName('date')[0];
            $date.textContent = `${set.modified}`;

            let $set = $url.getElementsByClassName('showset')[0];
            if (set.archive) {
                $set.dataset.set = set.inode;
            } else {
                $set.remove();
            }

            $block.appendChild($url);
        }
    }

    function fill_pagination($block, sets, page) {
        let total = sets.length;
        let pages = parseInt(total / cfg.PT_PAGE_RESULTS, 10) + 1;

        if (pages == 1)
            return;


        let $prev = tpl.get(tpl.page_prev);
        $prev.dataset.page = page + 1 - 1;
        $prev.classList.toggle('disabled', page < 1);
        $block.appendChild($prev);

        let limit = pages;
        if (limit > 10)
            limit = 10;

        for (let i = 0; i < limit; i++) {
            let $number = tpl.get(tpl.page_number);
            $number.dataset.page = i + 1;
            $number.textContent = i + 1;
            $number.classList.toggle('selected', i == page);

            $block.appendChild($number);
        }

        if (pages > limit && page > limit) {
            let $more = tpl.get(tpl.page_more);

            $block.appendChild($more);
        }

        if (page >= limit) {
            let $number = tpl.get(tpl.page_number);
            $number.dataset.page = page + 1;
            $number.textContent = page + 1;
            $number.classList.add('selected');

            $block.appendChild($number);
        }

        if (pages > limit && page + 1 < pages) {
            let $more = tpl.get(tpl.page_more);
            $block.appendChild($more);
        }

        let $next = tpl.get(tpl.page_next);
        $next.dataset.page = page + 1 + 1;
        $next.classList.toggle('disabled', page + 1 >= pages);
        $block.appendChild($next);
    }

    // {"type": "7z", "size": 1213797, "method": "LZMA2:1536k", "solid": true, "files": [
    //   {"name": "name.ext", "size": 123, "time": "2011-06-03 05:40:56", "crc": "F5E2CDC0"}, 
    // ]
    function fill_filelist($block, set, filelist) {
        let $main = tpl.get(tpl.filelist_main);

        let $link = $main.getElementsByTagName('a')[0];
        $link.href = set.url;
        $link.textContent = set.basename;

        let $info = $main.getElementsByClassName('info')[0];
        $info.textContent = `${set.sizeview}`;

        let $date = $main.getElementsByClassName('date')[0];
        $date.textContent = `${set.modified}`;

        if (!filelist || !filelist.extensions) {
            let $error = tpl.get(tpl.filelist_error);
            $main.appendChild($error);
        }
        else {
            let $info = tpl.get(tpl.filelist_info);

            let $extensions = $info.getElementsByClassName('extensions')[0];
            let extensions = filelist.extensions;
            for (let extension of extensions) {
                let $ext = tpl.get(tpl.filelist_ext);
                $ext.textContent = `${extension}`
                $extensions.appendChild($ext);
            }

            let $types = $_cl($info, 'types');
            let $type = tpl.get(tpl.filelist_type);

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
                let $item = tpl.get(tpl.filelist_item);
                let $dir  = $item.getElementsByClassName('dir')[0];
                let $name = $item.getElementsByClassName('name')[0];
                let $info = $item.getElementsByClassName('info')[0];

                if (file.dir)
                    $dir.textContent  = `${file.dir}`;
                $name.textContent = `${file.name}`;
                $name.title = `${file.time}`;
                $info.textContent = `${file.sizeview}`;

                if (file.dupe)
                   $item.classList.add('dupe');
                if (file.lesser)
                   $item.classList.add('lesser');
                $list.appendChild($item);
            }
            $main.appendChild($info);
        }

        $block.appendChild($main);
    }
}


//export
this.Printer = Printer;
}
