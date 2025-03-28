/* prints DOM/pages and dabatase results */

"use strict";
var ns_pt = new function() {

// helpers
const $_id = (id) => document.getElementById(id);
const $_cl = (node, className) => node.getElementsByClassName(className)[0];


function Templates() {
    this.results_recent = $_id('tpl-results-recent');
    this.results_search = $_id('tpl-results-search');
    this.path_exts = $_id('tpl-path-exts');
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
    this.exts = $_id('tpl-exts');
    this.exts_section = $_id('tpl-exts-section');
    this.ext = $_id('tpl-ext');
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
    let $fexts = $form['exts'];

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

    ///////////////////////////////////////////////////////////////////////////

    this.print_loader = function ()  {
        let $results = tpl.get(tpl.results_recent);
        let $loading = tpl.get(tpl.loading);

        // results header + spinner, delayed a bit to look like it's doing something
        $results.classList.add('info-loader')
        $content.appendChild($results);
        $content.appendChild($loading);
        // should be deleted when printing
    }

    this.print_error = function (msg) {
        let $error = tpl.get(tpl.error_text);
        
        clean_content();
        $error.textContent = msg;
        $content.appendChild($error);
    }

    ///////////////////////////////////////////////////////////////////////////

    function print_page_common($results, separator) {
        let $systems = tpl.get(tpl.systems);
        let $exts = tpl.get(tpl.exts);
        let $urls = tpl.get(tpl.urls);
        let $pagination = tpl.get(tpl.pagination);

        let sets = db.results;
        let sites =  db.subdomains;
        let page = get_page(sets);

        clean_content();

        fill_results_search($results, sets);
        $content.appendChild($results);

        fill_systems($systems, sites);
        $content.appendChild($systems);

        if ($fexts.value) {
            fill_exts($exts);
            $content.appendChild($exts);
        }

        fill_urls($urls, sets, page, separator);
        $content.appendChild($urls);

        fill_pagination($pagination, sets, page);
        $content.appendChild($pagination);
    }

    this.print_recent = function () {
        let $results = tpl.get(tpl.results_recent);
        print_page_common($results, true);
    }

    this.print_search = function () {
        let $results = tpl.get(tpl.results_search);
        print_page_common($results, false);
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
                let $system = tpl.get(tpl.system);
                let subdomain = element[0];
                let total = element[1];

                let sysname = cfg.PT_SYSTEM_CONFIG[subdomain] || subdomain;

                $system.dataset.site = subdomain;
                $system.textContent = sysname + ' · ' + total;
                if (current == subdomain)
                    $system.classList.add('selected');

                $block.appendChild($system);
                $block.appendChild(get_blank()); //nowrap oddities
            }
        );
    }

    function fill_exts($block) {
        let current = $fexts.value;

        let $ext = tpl.get(tpl.ext);
        $ext.dataset.ext = current;
        $ext.textContent = current;

        $block.appendChild($ext);
        $block.appendChild(get_blank()); //nowrap oddities
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

            if (set.upd) {
                $url.classList.add('updated')
            }

            if (set.fix) {
                $url.classList.add('fixable-set')
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

    ///////////////////////////////////////////////////////////////////////////

    this.print_path_exts = function () {
        let $exts = tpl.get(tpl.path_exts);

        let exts = db.results;
        fill_path_exts($exts, exts);

        clean_content();
        $content.appendChild($exts);
    }

    function fill_path_exts($block, exts) {
        let current = $fexts.value;

        // prepare sub-sections
        let $sections = { }
        Object.keys(cfg.PT_TOTALS_TYPES_INFO).forEach(key => {
            let $section = tpl.get(tpl.exts_section)

            let $info = $section.getElementsByClassName('info-section')[0];
            $info.textContent = cfg.PT_TOTALS_TYPES_INFO[key];

            $sections[key] = $section;
        });

        // read exts and put into sections
        Object.entries(exts)   // [key,val] array
            .sort((a, b) => {
                // sort by total sets
                let totals = b[1] - a[1];
                if (totals !== 0)
                    return totals;
                // sort by text
                if (a[0] < b[0]) return -1;
                if (a[0] > b[0]) return 1;
                return 0;
            })
            .forEach(element => {
                let $ext = tpl.get(tpl.ext);
                let ext = element[0];
                let total = element[1];

                $ext.dataset.ext = ext;
                $ext.textContent = ext + ' · ' + total;
                if (current && current == ext) // can't mark extension-less as selected tho
                    $ext.classList.add('selected');

                let type = cfg.PT_TOTALS_EXT_TYPE[ext]
                if (type)
                    $ext.classList.add(type);
                else
                    type = ''; //default

                let $section = $sections[type];
                $section.appendChild($ext);
                $section.appendChild(get_blank()); //nowrap oddities
        });

        // fill block
        Object.keys($sections).forEach(key => {
            $block.appendChild($sections[key]);
        });
    }

    ///////////////////////////////////////////////////////////////////////////

    this.print_filelist = function () {
        let $filelist = tpl.get(tpl.filelist);
        $filelist.id = 'overlay';

        fill_filelist($filelist, db.set, db.filelist);

        clean_overlay();
        $content.appendChild($filelist);
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
                $ext.dataset.fileext = extension;
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
                let $size = $item.getElementsByClassName('size')[0];
                let $date = $item.getElementsByClassName('date')[0];
                let $crc = $item.getElementsByClassName('crc')[0];

                if (file.dir)
                    $dir.textContent  = `${file.dir}`;
                $name.textContent = `${file.name}`;
                $size.textContent = `${file.sizeview}`;
                $date.textContent = `${file.time}`;
                $crc.textContent = `${file.crc}`;
                $name.classList.add(`hide-ext-${file.ext}`);

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
    
    ///////////////////////////////////////////////////////////////////////////

}


//export
this.Printer = Printer;
}
