import xml.etree.ElementTree as ET
import json, os
import datetime
import urllib.parse
import hashlib

OUTFILE = 'rss.xml'
MAX_UPDATES = 100

def get_updates():
    with open('index-clean.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    updates = []
    for set in data:
        name = set['nm']
        subdomain = set['sd']
        text_date = set['md']
        inode = set['id']
        upd = 'upd' in set and set['upd']
        if not text_date:
            continue
        
        basename = os.path.basename(name)

        url_dir = os.path.dirname(name)
        if url_dir:
            url_dir += '/'
        #url_basename = urllib.parse.quote_plus(basename)
        url_basename = basename
        for val, repl in [('%', '%25'), ('#', '%23'), (' ', '%20')]:
            if val in url_basename:
                url_basename = url_basename.replace(val, repl)
        url = 'https://%s.joshw.info/%s%s' % (subdomain, url_dir, url_basename)

        title = os.path.splitext(basename)[0]

        description = 'New!'
        if upd:
            description = 'Updated!'
        if basename.endswith('[old].7z'):
            description = 'Old!'
        
        date = datetime.datetime.fromisoformat(text_date)
        dumb_date = date.strftime("%a, %d %b %Y %H:%M:%S GMT").strip()

        # URL changes when files are renamed so use inodes (though inodes can be reused when files are deleted, happens less often)
        #guid = url + '?date=' + text_date.replace(' ', '_')
        guid = 'https://%s.joshw.info/%s%s?date=%s' % (subdomain, url_dir, inode, text_date.replace(' ', '_')) #unique enough I guess

        item = {}
        item['title'] = title
        item['link'] = url
        item['description'] = description
        item['date'] = date
        item['text_date'] = dumb_date
        item['guid'] = guid

        updates.append(item)

    # limit
    updates.sort(key=lambda item: (item['date'], item['title']), reverse=True)
    updates = updates[0: MAX_UPDATES]

    return updates

#TODO improve, meh
#TODO check if etree needs escaping
def write_xml(updates):
    root = ET.Element("rss", version="2.0")
    channel = ET.SubElement(root, "channel")

    title = ET.SubElement(channel, "title").text = "vgm.hcs64.com"
    link = ET.SubElement(channel, "link").text = "https://vgm.hcs64.com/"
    description = ET.SubElement(channel, "description").text = "VGM Updates"

    for update in updates:
        item = ET.SubElement(channel, "item")

        title = ET.SubElement(item, "title").text = update['title']
        link = ET.SubElement(item, "link").text = update['link']
        description = ET.SubElement(item, "description").text = update['description']
        pubdate = ET.SubElement(item, "pubDate").text = update['text_date']
        guid = ET.SubElement(item, "guid").text = update['guid']

    ET.indent(root)

    tree = ET.ElementTree(root)
    #tree.write("rss.xml", encoding='utf-8')
    with open(OUTFILE, 'wb') as f:
        f.write(b'<?xml version="1.0" encoding="UTF-8" ?>\r\n')
        tree.write(f, encoding='utf-8')

updates = get_updates()
write_xml(updates)
