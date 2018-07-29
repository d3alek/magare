## First steps on new Lime2 eMMC

Do in parallel the two sets of steps - first one deals with software and the second one with networking:

* Download appropriate Armbian version
* Flash to SD card using Etcher
* Put SD card in device, connect to internet and power
* Wait a bit, find device assigned IP (for example with `arp-scan`), connect with ssh and `root:1234`
* set a root password following prompts and remember it. Don't make account (`ctrl+c` when it asks)
* `sudo armian-config` > System > Install to eMMC > ext4 filesystem > wait 15 minutes... > accept power off > take SD card off > turn on
* sudo `armiban-config` > Personal > timezone to Sofia and hostame to `magare#`
* Make a `magare#.otselo.eu` entry in `/etc/ansible/hosts`
* `ansible-playbook magare.yaml -l "magare#.otselo.eu" -e @couchdb_variables.yaml --ask-vault-pass --ask-pass`
* `ansible-playbook magare-sda.yaml -l "magare#.otselo.eu"`
* Run `ansible-playbook magare-sda.yaml -l "magare#.otselo.eu"` again to fix permissions after system restart
* `ansible-playbook magare-firewall.yaml -l "magare#.otselo.eu"`
* `ansible-playbook certbot.yaml -l "magare#.otselo.eu"`
* `ansible-playbook magare-haproxy.yaml -l "magare#.otselo.eu"`
* `ansible-playbook couchdb.yaml -l "magare#.otselo.eu" -e @couchdb_variables.yaml --ask-vault-pass`

* Make an `A` DNS record for the new magare (`magare#.otselo.eu`)
* Add a crontab rule for root: `curl -4 "https://magare#.otselo.eu:pass@dyn.dns.he.net/nic/update?hostname=magare#.otselo.eu"`, where `pass` is taken from DNS console
* Add a new entry to `couchdb-cluster.yaml`
* Configure tunneling (through router for example), make sure host is reachable on `magare#.otselo.eu`, ideally Demilitarized Host (all traffic forwarded to it), otherwise ports `80, 443, 4369, 9100-9200`
* `ansible-playbook couchdb-cluster.yaml -l "magare#.otselo.eu"`

## Manual Setup
Make sure user on`magareta` has passwordless sudo access:

> echo "<user> ALL = (root) NOPASSWD:ALL" | sudo tee /etc/sudoers.d/<user>

## Launch CouchDB install playbook
> ansible-playbook couchdb.yaml -e @couchdb_variables.yaml --ask-vault-pass

Where `couchdb_variables.yaml` is a YAML file in the current directory with `admin_user`, `admin_password` and `cookie` (ideally `admin_password` and `cookie` are encrypted with Ansible)

## Add version control to a bucket

Intially do:

> cd design-documents
> ./update-version-control.sh "" $BUCKET user_colon_password.txt update.js validate.js

Then to update the design documents, specify a revision as the first argument instead of `""`

## Ansible Galaxy requirements

> ansible-galaxy install ipr-cnrs.nftables 

## Trully distributed

Each magare runs HAProxy on ports [80,443] and CouchDB on a random port. Each magare's HAProxy is configured to distribute traffic directly to the CouchDBs. That way if one magare fails, another can take over `magare.otselo.eu` (TODO).
