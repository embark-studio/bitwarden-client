import 'babel-polyfill'
import * as cryptoservice from '../jslib/dist/es/services/crypto.service'
import { CipherString } from '../jslib/dist/es/models/domain/cipherString';
import { FolderService } from '../jslib/dist/es/services/folder.service'
import { SymmetricCryptoKey } from '../jslib/dist/es/models/domain/symmetricCryptoKey'
import { SyncService } from '../jslib/dist/es/services/sync.service'
import { TokenService } from '../jslib/dist/es/services/token.service'
import { UserService } from '../jslib/dist/es/services/user.service'

class StorageService {
    constructor(){
        this.data = {}
    }
    get (item){
        return this.data[item]
    }
    save (key, value){
        return this.data[key] = value
    }
}

class MessagingService {
    send(message){
        console.log(message);
    }
}

class BitwardenClient{
    static request(subdomain, method, url, params){
        return new Promise((resolve, reject)=>{
            console.log(subdomain)
            url = this.settings[`${subdomain}BaseUrl`] + url
            console.log(url)
            const options = {
                ...this.options,
                method
            }

            const _request = new Request(url, options)
            fetch(_request, {
                body: params
            }).then((response)=>{
                resolve(response.json())
            }).catch((error)=>{
                console.log(error)
            })
        })
    }

    static get(subdomain = '', url){
        return this.request(subdomain, 'GET', url)
    }
    static put(subdomain = '', url, params){
        return this.request(subdomain, 'PUT', url, params)
    }
    static post(subdomain = '', url, params){
        return this.request(subdomain, 'POST', url, params)
    }
    static delete(subdomain = '', url){
        return this.request(subdomain, 'DELETE', url)
    }

    static storage(){
        return this.storageService = this.storageService || new StorageService()
    }

    static crypto(){
        return this.thecryptoservice = this.thecryptoservice || new cryptoservice.CryptoService(this.storage(), this.storage())
    }
    static encrypt(){
    }
    static decrypt(item){
        item = new CipherString(item)

        const [encType, key] = this.settings.key.split('.')
        this.crypto().rsaDecrypt(key).then((result)=>{
            console.log('result of rsa Decrypt', result)
        })
        const cryptoKey = new SymmetricCryptoKey(key, null, parseInt(encType))
        return this.crypto().decrypt(item, cryptoKey)
    }
    static login(email, password){
        // Login to your Bitwarden Account
        email = email.toLowerCase()

        const service = this.crypto()
        const key = service.makeKey(password, email)
        return service.hashPassword(password, key).then((hashedPassword)=>{
            const request = {
                email: email,
                masterPasswordHash: hashedPassword,
                provider: null,
                token: null,
                remember: null,
                device: null
            }

            const formData = new FormData();
            formData.append('grant_type', 'password')
            formData.append('username', email)
            formData.append('password', hashedPassword)
            formData.append('scope', 'api offline_access')
            formData.append('client_id', 'web')

            const url = '/connect/token'

            const response = this.post('identity', url, formData);

            response.then((data)=>{
                this.setToken(data.access_token)
                this.setKey(data.Key)
                this.setPrivateKey(data.PrivateKey)
                this.setRefreshToken(data.refresh_token)
            })
            return response
        })
    }

    static signup(email, password, passwordConfirmation){
        // Sign up for a Bitwarden Account
    }

    static logout(){
        // Log Out of your Bitwarden Account
    }
    static setKey(key){
        this.settings.key = key
        this.crypto().setKey(key)
    }
    static setToken(token){
        this.setHeaders({
            Authorization: `Bearer ${token}`
        })
    }
    static setRefreshToken(token){
        this.settings.refreshToken = token
    }
    static setPrivateKey(privateKey){
        this.settings.privateKey = privateKey
    }
    static getPasswords(){
        const tokenService = new TokenService(this.storage())
        const userService = new UserService(tokenService, this.storage())
        const noneFunction = function() {
            return "<none>"
        }
        const folderService = new FolderService(this.crypto(), userService, noneFunction, null, this.storage())
        const syncService = new SyncService(userService, null, null, folderService, null, this.crypto(), null, this.storage(), new MessagingService(), null)
        const sync = syncService.fullSync()

        return folderService.getAllDecrypted()
    }

    static setPassword(id, value){
        // Set a password within Bitwarden
    }

    static passwordReset(email){
        // Reset your master Bitwarden password
    }

    static setHeaders(headers = {}){
        console.log(headers)
        this.options.headers = new Headers({
            'Device-Type': 'web',
            ...headers
        })
    }
}
BitwardenClient.settings = {
    apiBaseUrl: 'https://api.bitwarden.com',
    identityBaseUrl: 'https://identity.bitwarden.com'
}
BitwardenClient.options = {
    cache: 'no-cache'
}
BitwardenClient.setHeaders()

window.cryptoservices = cryptoservice
window.BitwardenClient = BitwardenClient
