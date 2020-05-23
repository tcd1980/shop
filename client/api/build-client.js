import axios from 'axios';

export default ({ req }) => {
  if (typeof window === 'undefined') {
    /**
     * We are on the server
     *
     * Requests should be made with a baseUrl of 'http://SERVICE_NAME.NAMESPACE.svc.cluster.local'
     */

    return axios.create({
      baseURL: 'http://ingress-nginx-controller.ingress-nginx.svc.cluster.local',
      headers: req.headers
    });

  } else {
    /**
     * We must be on the browser
     *
     * Requests should be made with a baseUrl of ''
     */

    return axios.create();
  }
}