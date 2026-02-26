# Simplify original index.json removing some extra stuff to trim down file size a bit,
# mainly to remove extra ".json" sets, so that initial loads are a bit faster.
# Note that frontend is prepared to use both original and clean versions.

import json, os

with open('index.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

IS_SIMPLIFY = True
IS_DETECT_UPD = True
IS_DETECT_FIXABLE = True

sets_new = {}
sets_old = {}

data_new = []
for set in data:
    name = set['name']
    if name.endswith('.json'):
        continue
    if name.endswith('.txt'):
        continue

    # simplify names for a minuscule decrease in size after gzipping
    if IS_SIMPLIFY:
        set_new = {}

        set_new['sd'] = set['subdomain']
        set_new['nm'] = set['name']
        set_new['id'] = set['inode']
        if 'modified' in set:
            set_new['md'] = set['modified']
        if 'size' in set:
            set_new['sz'] = set['size']

        set = set_new #for later use
        data_new.append(set)
    else:
        data_new.append(set)

    # detect updated sets ("blah [..].7z" that have an "blah [..][old].7z") and mark them
    # note that [old] name may be found before or after current set name
    if IS_DETECT_UPD:
        name_base = os.path.splitext(name)[0]

        if name_base.endswith('[old]'): 
            # current is OLD: find if NEW exists
            name_new = name_base[0:-5]
            set_new = sets_new.get(name_new)
            if set_new:
                set_new['upd'] = True
            sets_old[name_new] = set
            set['old'] = True
        else:
            # current is NEW: find if OLD exists
            name_new = name_base
            if name_new in sets_old:
                set_new['upd'] = True
            sets_new[name_new] = set


    # detect sets that have a 'fixable' tag ("blah [fix-...].7z")
    if IS_DETECT_FIXABLE:
        name_base = os.path.splitext(name)[0]

        last_bracket = name_base.rfind('[')
        if last_bracket > 0:
            part = name_base[last_bracket:].lower()
            if part.startswith('[fix-') or part.startswith('[fix '):
                set['fix'] = True

#dump = json.dumps(data_new)

# Instead of a big dump, do it by small parts and combine them to add line feeds
# (this adds ~50-100kb but keeps git changes a bit saner)
# Also remove extra spaces to shave off some bytes.
parts = [json.dumps(obj, separators=(',', ':')) for obj in data] 
dump = "[\n" + ",\n".join(parts) + "\n]"

with open('index-clean.json', 'w', encoding='utf-8') as f:
    f.write(dump)
