# index.json updater
#
# We want to get latest .json only if file has changed in server. This is handled by wget
# ("wget --timestamp (url)") as long as file's timestamp is older than server's.
#
# Github's workflows redownload everything and git doesn't save timestamps though, so we could check
# a file's latest commit ("git log (file)") and apply it ("touch -d (format) (file)".
# However commit info may only exist when fetching all commits in the workflow (using fetch-depth: 0),
# otherwise would only get latest commit (from any file).
#
# Could also to redownload the file every time ("wget -q -O $INDEX_JSON $INFO_JSON_URL"), as it will be
# ignored by "git commit"), but it's not very gentle to the server.
#
# Instead have a text file with the file's last update timestamp and apply that, easier to setup/test/modify.

# env vars:
INFO_JSON_URL=$1
USER_MAIL=$2
USER_NAME=$3
INDEX_JSON=index.json
INDEX_VERSION=index.version

# get version from file
VERSION=$(cat $INDEX_VERSION)

# same, from commit (needs full repo download)
#VERSION=$(git log --pretty=format:%cI "$INDEX_JSON")

touch -am -c -d $VERSION "$INDEX_JSON"
echo "$VERSION"

wget -q --timestamp $INDEX_JSON $INFO_JSON_URL


CHANGED=$(git diff --name-only --exit-code $INDEX_JSON)
if [ "$CHANGED" != "$INDEX_JSON" ]; then
    echo "$INDEX_JSON: no change"
    exit 0
fi

echo "$INDEX_JSON: updated"

# may be needed by github actions
if [ ! -z "$USER_MAIL" ]; then
    git config user.email "$USER_MAIL"
fi
if [ ! -z "$USER_NAME" ]; then
    git config user.name "$USER_NAME"
fi

# get current date = version and overwrite file
NEW_VERSION=$(date +%Y-%m-%dT%T%z)
echo $NEW_VERSION > $INDEX_VERSION

# update changed files (if they actually changed)
git add "$INDEX_JSON"
git add "$INDEX_VERSION"
git commit -m "update sets"
git push

exit 0
