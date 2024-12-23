# Use the official Node.js image
FROM node:18

# Install Git
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Set the default working directory
WORKDIR /checkbranches

# The script will be provided via a volume, so no need to COPY it
CMD ["node", "checkbranches.js"]
