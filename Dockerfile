FROM helixious86/nodejs_base_image:latest
RUN sudo apt-get update -y && sudo apt-get upgrade -y
RUN sudo npm cache clean -f && sudo npm install -g n
RUN sudo apt-get install redis-server -y
RUN systemctl enable redis-server.service
RUN sudo systemctl restart redis-server.service
RUN git clone https://github.com/helixious/lemming.git \
&& cd lemming \
&& git pull