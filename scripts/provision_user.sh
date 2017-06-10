#!/usr/bin/env bash

ZSH_PROFILE="$HOME/.config/zsh/profile"

mkdir -p "$HOME/.cache" "$HOME/.config/zsh"
cat > "$ZSH_PROFILE" <<EOF
source \$HOME/env/bin/activate
export PATH="\$VIRTUAL_ENV/bin:\$HOME/node_modules/.bin:\$PATH"
export PROJECT=\$HOME/hsreplay.net
export PYTHONPATH=\$PROJECT
export DJANGO_SETTINGS_MODULE=hsreplaynet.settings
export HSREPLAYNET_DEBUG=1
export ENV_VAGRANT=1

cd \$PROJECT
EOF
cp /etc/skel/.zshrc "$HOME/.zshrc"

python3 -m venv "$HOME/env"
source "$ZSH_PROFILE"

pip install --upgrade pip setuptools
pip install -r "$PROJECT/requirements/dev.txt"

cd "$PROJECT"
yarn install --modules-folder "$HOME/node_modules" --pure-lockfile --no-progress

if [[ ! -e $PROJECT/hsreplaynet/local_settings.py ]]; then
	cp "$PROJECT/local_settings.example.py" "$PROJECT/hsreplaynet/local_settings.py"
fi

if [[ -e $HOME/joust ]]; then
	git -C "$HOME/joust" fetch -q --all && git -C "$HOME/joust" reset -q --hard origin/master
else
	git clone -q https://github.com/HearthSim/Joust "$HOME/joust"
fi

createdb --username postgres hsreplaynet
python "$PROJECT/manage.py" migrate --no-input
python "$PROJECT/manage.py" load_cards
python "$PROJECT/scripts/initdb.py"

influx --execute "create database hsreplaynet"
influx --execute "create database joust"

if [[ ! -d $PROJECT/hsreplaynet/static/vendor ]]; then
	"$PROJECT/scripts/get_vendor_static.sh"
fi

mkdir -p "$PROJECT/build/generated"
