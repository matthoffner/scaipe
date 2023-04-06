FROM python:3.10-slim-buster

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash -

RUN apt-get update \
    && apt-get install -y nodejs


RUN apt-get update && apt-get install gnupg wget -y && \
  wget --quiet --output-document=- https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor > /etc/apt/trusted.gpg.d/google-archive.gpg && \
  sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' && \
  apt-get update && \
  apt-get install google-chrome-stable -y --no-install-recommends && \
  rm -rf /var/lib/apt/lists/*


RUN apt-get update \
    && apt-get install -y \
        build-essential \
        curl \
        g++ \
	git \
        make \
        python3-venv \
        software-properties-common

# Create and change to the app directory.
WORKDIR /root/dalai

# Copy application dependency manifests to the container image.
# A wildcard is used to ensure both package.json AND package-lock.json are copied.
# Copying this separately prevents re-running npm install on every code change.
COPY package*.json ./

# Install dependencies.
# If you add a package-lock.json speed your build by switching to 'npm ci'.
# RUN npm ci --only=production
RUN npm install --production

# Copy local code to the container image.
COPY . ./

RUN npx dalai alpaca setup

# Run the web service on container startup.
CMD ["node", "index.js"]
