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

/***********************************************************
 * INTERFACE GRÁFICA
 ***********************************************************/

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

// Reseta o materialField dado
FriendlyChat.resetMaterialTextfield = function(element) {
  element.value = '';
  element.parentNode.MaterialTextfield.boundUpdateClassesHandler();
};

/***********************************************************
 * INICIALIZAÇÃO
 ***********************************************************/

// Verifica se o Firebase SDK foi corretamente configurado
FriendlyChat.prototype.checkSetup = function() {
  if (!window.firebase || !(firebase.app instanceof Function) || !firebase.app().options) {
    window.alert('Problemas na configuração do Firebase SDK!');
  }
};

// Atribui atalhos as instancias do firebase e inicializa a autenticação
FriendlyChat.prototype.initFirebase = function() {
  this.auth = firebase.auth();
  this.database = firebase.database();
  this.storage = firebase.storage();

  this.auth.onAuthStateChanged(this.onAuthStateChanged.bind(this));
};

/***********************************************************
 * INSTANCIA
 ***********************************************************/

// Instancia a classe
window.onload = function() {

};