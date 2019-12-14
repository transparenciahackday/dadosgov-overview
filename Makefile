SSH_HOST=opal5.opalstack.com
SSH_PORT=22
SSH_USER=thd
SSH_TARGET_DIR=/home/thd/apps/dadosgov-overview/
OUTPUTDIR=.

serve:
	python3 -m http.server

deploy: 
	rsync -e "ssh -p $(SSH_PORT)" -P -rvzc --cvs-exclude --delete $(OUTPUTDIR)/ $(SSH_USER)@$(SSH_HOST):$(SSH_TARGET_DIR)

dry-deploy:
	rsync -n -e "ssh -p $(SSH_PORT)" -P -rvzc --cvs-exclude --delete $(OUTPUTDIR)/ $(SSH_USER)@$(SSH_HOST):$(SSH_TARGET_DIR)

