import {parseQueryString} from 'aurelia-path';
import extend from 'extend';
import {findSelected} from './utils';

const baseStorageKey = 'AureliaStorageClient';

export class StorageClient {
  constructor(storage) {
    this.storage = storage ? storage : window.localStorage;

    this.baseUrl = '';
  }

  get baseUrl() {
    return this._baseUrl;
  }

  set baseUrl(url) {
    this._baseUrl = url;
    this.storageKey = `${baseStorageKey}-${url}`;

    return url;
  }

  builder = {
    withBaseUrl: baseUrl => {
      this.baseUrl = baseUrl;
      return baseUrl;
    }
  };

  configure(_configure) {
    if (typeof _configure === 'function') {
      _configure(this.builder);
    } else if (typeof _configure === 'string') {
      this.baseUrl = _configure;
    }
  }

  send(method, path, body, optionsCopy) {
    let [, pathKey, , id, , query] = /^([^\/^\?]+)(\/)?([^\/^\?]+)?(\?)?(.+)?/.exec(path);
    let key = `${this.storageKey}${pathKey}`;
    let queryParameters = parseQueryString(query);
    if (id) queryParameters.id = id;

    let resource = JSON.parse(this.storage.getItem(key));
    let selection = findSelected(resource, queryParameters);

    return new Promise(resolve => {
      switch (method.toUpperCase()) {
      case 'GET': {
        resolve(selection.length === 1 ? selection[0] : selection);
        break;
      }
      case 'POST': {
        let addition = Array.isArray(body) ? body : [body];

        addition.forEach(el => {
          el.id = resource[resource.length - 1].id + 1;
          resource.push(el);
        });

        this.storage.setItem(key, JSON.stringify(resource));

        resolve(body);
        break;
      }
      case 'PUT': {
        let replacedSelection = selection.map(el => el = Object.assign({id: el.id}, body));

        let newResource = resource.map(el => {
          let index = replacedSelection.findIndex(_el => el.id === _el.id);
          return (index !== -1) ? el = replacedSelection[index] : el;
        });

        this.storage.setItem(key, JSON.stringify(newResource));

        resolve(replacedSelection);
        break;
      }
      case 'PATCH': {
        let patchedSelection = selection.map(el => extend(true, el, body));

        let newResource = resource.map(el => {
          let index = patchedSelection.findIndex(_el => el.id === _el.id);
          return (index !== -1) ? el = patchedSelection[index] : el;
        });

        this.storage.setItem(key, JSON.stringify(newResource));

        resolve(patchedSelection);
        break;
      }
      case 'DELETE': {
        if (Object.keys(queryParameters).length === 0) {
          this.storage.deleteItem(key);

          resolve(resource);
          break;
        }

        let newResource = [];
        resource.forEach(el => {
          let index = selection.findIndex(_el => el.id === _el.id);
          if (index === -1) newResource.push(el);
        });

        this.storage.setItem(key, JSON.stringify(newResource));

        resolve(selection);
        break;
      }
      default:
        console.info(`Unknown method ${method}`);
      }
    });
  }

  clear() {
    this.storage.deleteItem(this.storageKey);
  }

  static clear() {
    const reg = /^${baseStorageKey}.+?/;

    for (let i = 0; i < localStorage.length; i++) {
      if (reg.test(localStorage.key(i))) {
        this.storage.deleteItem(localStorage.key(i));
      }
    }
  }
}
