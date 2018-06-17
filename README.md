## Launch CouchDB install playbook
> ansible-playbook couchdb.yaml -e @couchdb_variables.yaml --ask-vault-pass

Where `couchdb_variables.yaml` is a YAML file in the current directory with `admin_user`, `admin_password` and `cookie` (ideally `admin_password` and `cookie` are encrypted with Ansible)

## Add version control to a bucket

Intially do:

> cd design-documents
> ./update-version-control.sh "" $BUCKET user_colon_password.txt update.js validate.js

Then to update the design documents, specify a revision as the first argument instead of `""`
