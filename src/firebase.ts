import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  User as FirebaseAuthUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  collection, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs
} from 'firebase/firestore';

const customNetlifyConfig = {
    apiKey: "AIzaSyACvR7KEzJs719E0JJtFiDpiZk0kHYnQyE",
    authDomain: "elev8-be0f4.firebaseapp.com",
    projectId: "elev8-be0f4",
    storageBucket: "elev8-be0f4.firebasestorage.app",
    messagingSenderId: "939507136986",
    appId: "1:939507136986:web:8a8d417cbbc80921eda8e3"
};

const firebaseConfig = customNetlifyConfig;

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const rawAuth = getAuth(app);
const rawDb = getFirestore(app);

// Global declaration to map firebase.User to FirebaseAuthUser
declare global {
  namespace firebase {
    type User = FirebaseAuthUser;
  }
}

class DocumentSnapshotWrapper {
  private _exists: boolean;
  private _data: any;

  constructor(exists: boolean, data: any) {
    this._exists = exists;
    this._data = data;
  }

  get exists() {
    return this._exists;
  }

  data() {
    return this._data;
  }
}

class QueryDocumentSnapshotWrapper {
  id: string;
  ref: DocumentReferenceWrapper;
  private _data: any;

  constructor(id: string, ref: DocumentReferenceWrapper, data: any) {
    this.id = id;
    this.ref = ref;
    this._data = data;
  }

  data() {
    return this._data;
  }
}

class QuerySnapshotWrapper {
  docs: QueryDocumentSnapshotWrapper[];

  constructor(docs: QueryDocumentSnapshotWrapper[]) {
    this.docs = docs;
  }
}

class DocumentReferenceWrapper {
  private _path: string[];

  constructor(path: string[]) {
    this._path = path;
  }

  collection(collectionName: string) {
    return new CollectionReferenceWrapper([...this._path, collectionName]);
  }

  async get() {
    const docRef = doc(rawDb, this._path[0], ...this._path.slice(1));
    const snap = await getDoc(docRef);
    return new DocumentSnapshotWrapper(snap.exists(), snap.data());
  }

  async set(data: any, options?: { merge?: boolean }) {
    const docRef = doc(rawDb, this._path[0], ...this._path.slice(1));
    await setDoc(docRef, data, options || {});
  }

  async update(data: any) {
    const docRef = doc(rawDb, this._path[0], ...this._path.slice(1));
    await updateDoc(docRef, data);
  }

  async delete() {
    const docRef = doc(rawDb, this._path[0], ...this._path.slice(1));
    await deleteDoc(docRef);
  }
}

class CollectionReferenceWrapper {
  private _path: string[];

  constructor(path: string[]) {
    this._path = path;
  }

  doc(docId: string) {
    return new DocumentReferenceWrapper([...this._path, docId]);
  }

  onSnapshot(onNext: (snapshot: QuerySnapshotWrapper) => void, onError?: (error: any) => void) {
    const colRef = collection(rawDb, this._path[0], ...this._path.slice(1));
    return onSnapshot(
      colRef,
      (snapshot) => {
        const docs = snapshot.docs.map(
          (d) =>
            new QueryDocumentSnapshotWrapper(
              d.id,
              new DocumentReferenceWrapper([...this._path, d.id]),
              d.data()
            )
        );
        onNext(new QuerySnapshotWrapper(docs));
      },
      onError
    );
  }

  async get() {
    const colRef = collection(rawDb, this._path[0], ...this._path.slice(1));
    const snapshot = await getDocs(colRef);
    const docs = snapshot.docs.map(
      (d) =>
        new QueryDocumentSnapshotWrapper(
          d.id,
          new DocumentReferenceWrapper([...this._path, d.id]),
          d.data()
        )
    );
    return new QuerySnapshotWrapper(docs);
  }
}

class DbWrapper {
  collection(collectionName: string) {
    return new CollectionReferenceWrapper([collectionName]);
  }
}

class AuthWrapper {
  get currentUser() {
    return rawAuth.currentUser;
  }

  onAuthStateChanged(callback: (user: FirebaseAuthUser | null) => void) {
    return onAuthStateChanged(rawAuth, callback);
  }

  async signInWithEmailAndPassword(email: string, pass: string) {
    return signInWithEmailAndPassword(rawAuth, email, pass);
  }

  async createUserWithEmailAndPassword(email: string, pass: string) {
    return createUserWithEmailAndPassword(rawAuth, email, pass);
  }

  async signOut() {
    return signOut(rawAuth);
  }
}

export const db = new DbWrapper() as any;
export const auth = new AuthWrapper() as any;
export const appId = 'procure-monitor-prod';

const firebaseCompatMock = {
  apps: getApps(),
  initializeApp: (config: any) => initializeApp(config),
  firestore: () => db,
  auth: () => auth,
};

export default firebaseCompatMock as any;
