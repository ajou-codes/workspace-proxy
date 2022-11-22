import * as k8s from "@kubernetes/client-node";
import http from "http";
import httpProxy from "http-proxy";

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

const NAMESPACE_NAME = 'workspace';
const LABEL_SELECTOR = 'ajou.codes/type=workspace';

const listFn = () => k8sApi.listNamespacedPod(
    NAMESPACE_NAME,
    undefined,
    undefined,
    undefined,
    undefined,
    LABEL_SELECTOR
);

const informer = k8s.makeInformer(kc, `/api/v1/namespaces/${NAMESPACE_NAME}/pods`, listFn, LABEL_SELECTOR);

informer.on('error', (err: k8s.V1Pod) => {
    console.error(err);
    // Restart informer after 5sec
    setTimeout(() => {
        informer.start();
    }, 1000);
});

informer.start().then(() => {
    function getWorkspaceInfo(workspaceId): k8s.V1Pod {
        return informer.get(workspaceId);
    }

    const proxy = httpProxy.createProxyServer({ ws: true, secure: false, changeOrigin: true });

    const server = http.createServer((req, res) => {
        // node.js http library make headers all lowercase
        const workspaceId = req.headers['x-workspace-id'];

        console.log('workspace id: ' + workspaceId);
        console.log('workspace list k8s: ');
        console.log(informer.list());

        if (!workspaceId){
            res.statusCode = 404;
            res.end();
            return;
        }

        // WIP: for port forwarding
        const port = req.headers['x-workspace-port'];


        // find pod ip
        const workspaceInfo = getWorkspaceInfo(workspaceId);
        console.log('workspaceInfo: ');
        console.log(workspaceInfo);

        if (!workspaceInfo){
            res.statusCode = 404;
            res.end();
            return;
        }

        const workspaceUrl = `http://${workspaceInfo.status.podIP}.${NAMESPACE_NAME}.pod.cluster.local`;

        proxy.web(req, res, {
            target: workspaceUrl,
        });
    });

    // Web Socket
    server.on('upgrade', (req, socket, head) => {
        const workspaceId = req.headers['x-workspace-id'];
        const workspaceInfo = getWorkspaceInfo(workspaceId);
        const workspaceUrl = `http://${workspaceInfo.status.podIP}.${NAMESPACE_NAME}.pod.cluster.local`;

        proxy.ws(req, socket, head, {
            target: workspaceUrl
        });
    });

    server.listen(8000);
});

