# index.json updater (run by github's cron every now and then)
#
# We want to get latest .json only if file has changed in joshw's server. This is handled by wget
# ("wget --timestamp (url)") as long as file's timestamp is older than server's.
#
# Github's workflows however redownload everything from repo, and git doesn't save timestamps though, so
# repo's index.json has no date to compare. We could check file's latest commit ("git log (file)") and
# apply it ("touch -d (format) (file)". However commit info may only exist when fetching all commits in
# the workflow (using fetch-depth: 0), otherwise would only get latest commit from any file.
#
# Could also redownload index.json every time ("wget -q -O $INDEX_JSON $INFO_JSON_URL"), as would be
# ignored by "git commit"), but it's not very gentle to the server.
#
# Instead we have a text file with the file's last update timestamp and apply that, easier to setup/test/modify.

# env vars:
INFO_JSON_URL=$1
EXTS_JSON_URL=$2
USER_MAIL=$3
USER_NAME=$4
INDEX_JSON=index.json
INDEXC_JSON=index-clean.json
EXTS_JSON=exts.json
INDEX_VERSION=index.version

# get version from helper file (no need to get exts version since they should go in pairs)
VERSION=$(cat $INDEX_VERSION)

# same from commit but needs a full repo download = worse
#VERSION=$(git log --pretty=format:%cI "$INDEX_JSON")

# update local files to last date (so can be compared vs server with wget)
touch -am -c -d $VERSION "$INDEX_JSON"
touch -am -c -d $VERSION "$EXTS_JSON"
#echo "$VERSION"

wget -q --timestamp $INDEX_JSON $INFO_JSON_URL
wget -q --timestamp $EXTS_JSON $EXTS_JSON_URL


CHANGED=$(git diff --name-only --exit-code $INDEX_JSON)
if [ "$CHANGED" != "$INDEX_JSON" ]; then
    echo "$INDEX_JSON: no change (old date: $VERSION)"
    exit 0
fi

# clean index.json for smaller sizes
python3 ./.index-cleaner.py


# get current date = version and overwrite file
NEW_VERSION=$(date +%Y-%m-%dT%T%z)

echo "$INDEX_JSON: updated (old: $VERSION, new: $NEW_VERSION)"

# may be needed by github actions in order to commit below
if [ ! -z "$USER_MAIL" ]; then
    git config user.email "$USER_MAIL"
fi
if [ ! -z "$USER_NAME" ]; then
    git config user.name "$USER_NAME"
fi

echo $NEW_VERSION > $INDEX_VERSION

# commit changed files (ignored if not actually changed), so site is re-deployed by github's bots
git add "$INDEX_VERSION"
git add "$INDEXC_JSON"
git add "$EXTS_JSON"
# no need to update index.json as timestamp is in index.version and generated index-clean.json
# is now used and updated instead (unused index.json would be deployed as well, bloating the site)
#git add "$INDEX_JSON"

git commit -m "update sets"
git push

# 

exit 0
