# Denna Dockerfile förutsätter att hela monorepot har byggts
# och att byggkontexten är roten av monorepot.

FROM nginx:alpine

WORKDIR /usr/share/nginx/html

# Kopiera den förbyggda portalen från monorepots dist-mapp
COPY kalles-customer-success/apps/portal/dist .

# Konfigurera Nginx för Cloud Run (lyssna på port 8080)
RUN sed -i 's/listen\(.*\)80;/listen 8080;/g' /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
