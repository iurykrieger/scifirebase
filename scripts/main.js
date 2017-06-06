/**
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

// Inicializa o FriendlyChat
function FriendlyChat() {
  this.checkSetup();

  // Atalhos para elementos do DOM
  this.messageList = document.getElementById('messages');
  this.messageForm = document.getElementById('message-form');
  this.messageInput = document.getElementById('message');
  this.submitButton = document.getElementById('submit');
  this.submitImageButton = document.getElementById('submitImage');
  this.imageForm = document.getElementById('image-form');
  this.mediaCapture = document.getElementById('mediaCapture');
  this.userPic = document.getElementById('user-pic');
  this.userName = document.getElementById('user-name');
  this.signInButton = document.getElementById('sign-in');
  this.signOutButton = document.getElementById('sign-out');
  this.signInSnackbar = document.getElementById('must-signin-snackbar');

  // Listeners de eventos para envio de mensagens
  this.messageForm.addEventListener('submit', this.saveMessage.bind(this));
  this.signOutButton.addEventListener('click', this.signOut.bind(this));
  this.signInButton.addEventListener('click', this.signIn.bind(this));

  // Listeners de eventos para o botão
  var buttonTogglingHandler = this.toggleButton.bind(this);
  this.messageInput.addEventListener('keyup', buttonTogglingHandler);
  this.messageInput.addEventListener('change', buttonTogglingHandler);

  // Listeners de eventos para upload de imagens
  this.submitImageButton.addEventListener('click', function(e) {
    e.preventDefault();
    this.mediaCapture.click();
  }.bind(this));
  this.mediaCapture.addEventListener('change', this.saveImageMessage.bind(this));

  //Inicializa o Firebase
  this.initFirebase();
}

// Atribui atalhos as instancias do firebase e inicializa a autenticação
FriendlyChat.prototype.initFirebase = function() {
  this.auth = firebase.auth();
  this.database = firebase.database();
  this.storage = firebase.storage();

  this.auth.onAuthStateChanged(this.onAuthStateChanged.bind(this));
};

// Carrega as mensagens e escuta as próximas
FriendlyChat.prototype.loadMessages = function() {
  this.messagesRef = this.database.ref('messages');
  this.messagesRef.off();

  var setMessage = function(data){
    var val = data.val();
    this.displayMessage(data.key, val.name, val.text, val.photoURL, val.imageUrl);
  }.bind(this);

  this.messagesRef.limitToLast(20).on('child_added', setMessage);
  this.messagesRef.limitToLast(20).on('child_changed', setMessage);
};

// Salva uma nova mensagem do Firebase DB
FriendlyChat.prototype.saveMessage = function(e) {
  e.preventDefault();

  // Verifica se o usuário digitou uma mensagem e está logado
  if (this.messageInput.value && this.checkSignedInWithMessage()) {
    var currentUser = this.auth.currentUser;

    //Após o "push" da mensagem o materialTextField é resetado e o botão volta a ser bloqueado
    this.messagesRef.push({
      name: currentUser.displayName,
      text: this.messageInput.value,
      photoURL: currentUser.photoURL || '/images/profile_placeholder.png'
    }).then(function(){
        FriendlyChat.resetMaterialTextfield(this.messageInput);
        this.toggleButton();
    }.bind(this)).catch(function(error){
        console.error('Error writing new message to Firebase Database', error);
    });
  }
};

// Atribui a URL do elemento "img" a URL da imagem armazenada no Cloud Storage
FriendlyChat.prototype.setImageUrl = function(imageUri, imgElement) {

  // Resolve a URL da imagem a partir do endereço URI do Firebase DB
  if(imageUri.startsWith('gs://')){
    imgElement.src = FriendlyChat.LOADING_IMAGE_URL;

    //Obtem a URL a partir da URI e atribui ao "src" do elemento no DOM
    this.storage.refFromURL(imageUri).getMetadata().then(function(metadata){
      imgElement.src = metadata.downloadURLs[0];
    });
  } else{
    imgElement.src = imageUri;
  }
};

// Salva a nova mensagem contendo uma URI no Firebase
// salvando primeiro a imagem no Firebase Storage
FriendlyChat.prototype.saveImageMessage = function(event) {
  event.preventDefault();
  var file = event.target.files[0];

  // Limpa a seleção no seletor de arquivos
  this.imageForm.reset();

  // Verifica se o arquivo selecionado é uma imagem
  if (!file.type.match('image.*')) {
    var data = {
      message: 'Você só pode selecionar imagens.',
      timeout: 2000
    };
    this.signInSnackbar.MaterialSnackbar.showSnackbar(data);
    return;
  }
  // Verifica se o usuário está logado
  if (this.checkSignedInWithMessage()) {

    var currentUser = this.auth.currentUser;

    // Após o "push" da imagem faz o armazenamento da mesma no Cloud Storage
    this.messagesRef.push({
      name: currentUser.displayName,
      imageUrl: FriendlyChat.LOADING_IMAGE_URL,
      photoURL: currentUser.photoURL || '/images/profile_placeholder.png'
    }).then(function(data){
      var filePath = currentUser.uid + '/' + data.key + '/' + file.name;

      // Salva o arquivo da imagem no Firebase Storage e atualiza a "imageUrl" com a url final
      return this.storage.ref(filePath).put(file).then(function(snapshot) {
        var fullPath = snapshot.metadata.fullPath;
        return data.update({imageUrl: this.storage.ref(fullPath).toString()});
      }.bind(this));
    }.bind(this)).catch(function(error){
      console.error('There was an error uploading a file to Cloud Storage: ', error);
    });

  }
};

// Loga no FriendlyChat
FriendlyChat.prototype.signIn = function() {
  var provider = new firebase.auth.GoogleAuthProvider();
  this.auth.signInWithPopup(provider);
};

// Desloga do FriendlyChat
FriendlyChat.prototype.signOut = function() {
  this.auth.signOut();
};

// Função executada quando o estado da autenticação é modificado (login/logout)
FriendlyChat.prototype.onAuthStateChanged = function(user) {
  if (user) { //usuário logado

    // Atribui a imagem e nome de perfil
    this.userPic.style.backgroundImage = 'url(' + user.photoURL + ')';
    this.userName.textContent = user.displayName;

    // Exibe a foto de perfil e botão de logout
    this.userName.removeAttribute('hidden');
    this.userPic.removeAttribute('hidden');
    this.signOutButton.removeAttribute('hidden');

    // Esconde botão de login
    this.signInButton.setAttribute('hidden', 'true');

    // Carrega as mensagens
    this.loadMessages();

  } else { // usuário deslogado
    // Esconde foto de perfil e botão de logout
    this.userName.setAttribute('hidden', 'true');
    this.userPic.setAttribute('hidden', 'true');
    this.signOutButton.setAttribute('hidden', 'true');

    // Exibe botão de login
    this.signInButton.removeAttribute('hidden');
  }
};

// Verifica se o usuário está logado, senão exibe uma mensagem
FriendlyChat.prototype.checkSignedInWithMessage = function() {
  // Se logado retorna verdadeiro
  if(this.auth.currentUser){
    return true;
  }

  // Se não logado retorna mensagem
  var data = {
    message: 'You must sign-in first',
    timeout: 2000
  };
  this.signInSnackbar.MaterialSnackbar.showSnackbar(data);
  return false;
};

// Reseta o materialField dado
FriendlyChat.resetMaterialTextfield = function(element) {
  element.value = '';
  element.parentNode.MaterialTextfield.boundUpdateClassesHandler();
};

// Template HTML de mensagens
FriendlyChat.MESSAGE_TEMPLATE =
    '<div class="message-container">' +
      '<div class="spacing"><div class="pic"></div></div>' +
      '<div class="message"></div>' +
      '<div class="name"></div>' +
    '</div>';

// A URL do GIF de carregamento das imagens
FriendlyChat.LOADING_IMAGE_URL = 'https://www.google.com/images/spin-32.gif';

// Exibe a imagem na página
FriendlyChat.prototype.displayMessage = function(key, name, text, picUrl, imageUri) {
  var div = document.getElementById(key);
  // Cria o elemento de imagem se o mesmo não existir
  if (!div) {
    var container = document.createElement('div');
    container.innerHTML = FriendlyChat.MESSAGE_TEMPLATE;
    div = container.firstChild;
    div.setAttribute('id', key);
    this.messageList.appendChild(div);
  }

  // Atribui a imagem ao fundo
  if (picUrl) {
    div.querySelector('.pic').style.backgroundImage = 'url(' + picUrl + ')';
  }
  div.querySelector('.name').textContent = name;
  var messageElement = div.querySelector('.message');

  if (text) { // Se a mensagem é texto
    messageElement.textContent = text;
    // Troca as quebras de linha por <br>
    messageElement.innerHTML = messageElement.innerHTML.replace(/\n/g, '<br>');
  } else if (imageUri) { // Se a mensagem é imagem
    var image = document.createElement('img');

    // Faz o scroll para cima ao carregar a imagem
    image.addEventListener('load', function() {
      this.messageList.scrollTop = this.messageList.scrollHeight;
    }.bind(this));
    this.setImageUrl(imageUri, image);

    // Adiciona o elemento no DOM
    messageElement.innerHTML = '';
    messageElement.appendChild(image);
  }
  // Mostra o card com fade-in
  setTimeout(function() {div.classList.add('visible')}, 1);
  this.messageList.scrollTop = this.messageList.scrollHeight;
  this.messageInput.focus();
};

// Habilita ou desabilita o botão de envio da mensagem dependendo dos valores do input
FriendlyChat.prototype.toggleButton = function() {
  if (this.messageInput.value) {
    this.submitButton.removeAttribute('disabled');
  } else {
    this.submitButton.setAttribute('disabled', 'true');
  }
};

// Verifica se o Firebase SDK foi corretamente configurado
FriendlyChat.prototype.checkSetup = function() {
  if (!window.firebase || !(firebase.app instanceof Function) || !firebase.app().options) {
    window.alert('Problemas na configuração do Firebase SDK!');
  }
};

// Instancia a classe
window.onload = function() {
  window.friendlyChat = new FriendlyChat();
};
