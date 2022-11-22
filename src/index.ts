import * as k8s from "@kubernetes/client-node";

const kc = new k8s.KubeConfig();

kc.loadFromDefault();

const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

const NAMESPACE_NAME = 'ajou-coding-hub';
const LABEL_SELECTOR = 'ajou.codes/type=workspace';

const listFn = () => k8sApi.listNamespacedPod(
    NAMESPACE_NAME,
    undefined,
    undefined,
    undefined,
    undefined,
    LABEL_SELECTOR
);

const informer = k8s.makeInformer(kc, `/api/v1/${NAMESPACE_NAME}/default/pods`, listFn, LABEL_SELECTOR);

informer.on('add', (obj: k8s.V1Pod) => { console.log(`Added: ${obj.metadata!.name}`); });
informer.on('update', (obj: k8s.V1Pod) => { console.log(`Updated: ${obj.metadata!.name}`); });
informer.on('delete', (obj: k8s.V1Pod) => { console.log(`Deleted: ${obj.metadata!.name}`); });
informer.on('error', (err: k8s.V1Pod) => {
    console.error(err);
    // Restart informer after 5sec
    setTimeout(() => {
        informer.start();
    }, 1000);
});

informer.start().then(() => {
    const loopDemo = () => {
        console.log(informer.list().length);
        for (let v1Pod of informer.list()) {
        }

        setTimeout(loopDemo, 2000);
    }

    loopDemo();
});
