#!/usr/bin/env bash

PROJECT="$HOME/hsreplay.net"

mkdir -p "$HOME/.cache" "$HOME/.config/zsh"
echo 'source $HOME/env/bin/activate' > "$HOME/.config/zsh/profile"
echo 'export PATH=$VIRTUAL_ENV/bin:$HOME/node_modules/.bin:$PATH' >> "$HOME/.config/zsh/profile"
echo 'export HSREPLAYNET_DEBUG=1' >> "$HOME/.config/zsh/profile"
echo "cd $PROJECT" >> "$HOME/.config/zsh/profile"
cp /etc/skel/.zshrc "$HOME/.zshrc"

python3 -m venv "$HOME/env"
source "$HOME/env/bin/activate"
pip install --upgrade pip setuptools
pip install -r "$PROJECT/requirements/dev.txt"

export PATH="$HOME/node_modules/.bin:$PATH"

cd "$PROJECT"
yarn install --modules-folder "$HOME"

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
influx --execute "create database metastats"
influx --execute "create database joust"

if [[ ! -d $PROJECT/hsreplaynet/static/vendor ]]; then
	"$PROJECT/scripts/get_vendor_static.sh"
fi

mkdir -p "$PROJECT/build/generated"

"$PROJECT/scripts/update_log_data.sh"
