# Simplify original index.json removing some extra stuff to trim down file size a bit,
# mainly to remove extra ".json" sets, so that initial loads are a bit faster.
# Note that frontend is prepared to use both original and clean versions.

import json

with open('index.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

IS_SIMPLIFY = True

data_new = []
for set in data:
    if set['name'].endswith('.json'):
        continue
    if set['name'].endswith('.txt'):
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

        data_new.append(set_new)
    else:
        data_new.append(set)

dump = json.dumps(data_new)

with open('index-clean.json', 'w', encoding='utf-8') as f:
    f.write(dump)
