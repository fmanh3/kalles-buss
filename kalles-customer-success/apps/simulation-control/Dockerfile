# Denna Dockerfile förutsätter att hela monorepot har byggts
# och att byggkontexten är roten av monorepot.

FROM nginx:alpine

WORKDIR /usr/share/nginx/html

# Kopiera den förbyggda portalen från monorepots dist-mapp
COPY kalles-customer-success/apps/simulation-control/dist .

# Kopiera vår custom nginx config (samma som portalen för att undvika caching)
COPY kalles-customer-success/apps/portal/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
