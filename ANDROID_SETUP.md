# 📱 Como Testar o App no Android Studio

## Pré-requisitos

### 1. Verificar se tem Java JDK instalado
```bash
java -version
# Deve ter JDK 11 ou superior
```

Se não tiver:
```bash
sudo apt update
sudo apt install openjdk-11-jdk
```

## Instalação do Android Studio

### 1. Baixar Android Studio
```bash
# Acesse: https://developer.android.com/studio
# Ou via snap:
sudo snap install android-studio --classic
```

### 2. Configurar Android SDK

Ao abrir o Android Studio pela primeira vez:
1. **Welcome Screen → More Actions → SDK Manager**
2. Na aba **SDK Platforms**, marque:
   - ✅ Android 14.0 (API 34) - Recomendado
   - ✅ Android 13.0 (API 33)
   - ✅ Android 12.0 (API 31)

3. Na aba **SDK Tools**, marque:
   - ✅ Android SDK Build-Tools
   - ✅ Android Emulator
   - ✅ Android SDK Platform-Tools
   - ✅ Intel x86 Emulator Accelerator (HAXM) [se Intel]
   - ✅ Android SDK Command-line Tools

4. Clique em **Apply** e aguarde o download.

### 3. Configurar Variáveis de Ambiente

Adicione ao final do arquivo `~/.bashrc`:

```bash
nano ~/.bashrc
```

Adicione estas linhas:
```bash
# Android SDK
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

Salve (Ctrl+O, Enter, Ctrl+X) e aplique:
```bash
source ~/.bashrc
```

Verifique:
```bash
echo $ANDROID_HOME
# Deve mostrar: /home/seu-usuario/Android/Sdk

adb --version
# Deve mostrar a versão do ADB
```

## Criar um Emulador Android

### Via Android Studio (mais fácil)

1. Abra o Android Studio
2. **Tools → Device Manager** (ou ícone 📱 no canto superior)
3. Clique em **Create Device**
4. Escolha um modelo:
   - **Phone → Pixel 5** (recomendado)
   - Next
5. Escolha uma System Image:
   - **API 34 (Android 14.0)** - Tiramisu
   - Download se necessário
   - Next
6. Configure:
   - Nome: `Pixel_5_API_34`
   - **Startup orientation**: Portrait
   - **Advanced Settings**:
     - RAM: 2048 MB ou mais
     - Internal Storage: 2048 MB ou mais
   - Finish

### Via Linha de Comando

```bash
# Listar system images disponíveis
sdkmanager --list | grep system-images

# Baixar uma image (se necessário)
sdkmanager "system-images;android-34;google_apis;x86_64"

# Criar emulador
avdmanager create avd -n Pixel_5_API_34 \
  -k "system-images;android-34;google_apis;x86_64" \
  -d pixel_5

# Listar emuladores criados
emulator -list-avds
```

## Rodar o App no Emulador

### Método 1: Via Expo (Mais Simples)

#### 1. Iniciar o emulador
```bash
# Via Android Studio: Device Manager → ▶️ Play

# Ou via terminal:
emulator -avd Pixel_5_API_34 &
```

#### 2. Verificar se o device foi reconhecido
```bash
adb devices
# Deve aparecer algo como:
# emulator-5554   device
```

#### 3. Iniciar o Expo
```bash
cd /home/shurillo/Programming/grow/mobile
npm start
```

#### 4. Abrir no Android
No terminal do Expo, pressione **`a`** para abrir no Android automaticamente.

Ou escaneie o QR Code com o app **Expo Go** instalado no emulador.

### Método 2: Build de Desenvolvimento (Recomendado para produção)

#### 1. Configurar expo-dev-client
```bash
cd /home/shurillo/Programming/grow/mobile
npx expo install expo-dev-client
```

#### 2. Build para Android
```bash
# Build local (sem Expo Go)
npx expo run:android
```

Isso vai:
- Instalar dependências Android
- Compilar o app
- Instalar no emulador
- Iniciar automaticamente

**Primeira vez pode demorar 5-10 minutos!**

## Troubleshooting

### Problema 1: "SDK location not found"
```bash
# Criar arquivo local.properties no projeto Android
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
```

### Problema 2: Emulador não inicia
```bash
# Verificar KVM (Linux)
egrep -c '(vmx|svm)' /proc/cpuinfo
# Se retornar 0, sua CPU não suporta virtualização

# Verificar se KVM está habilitado
lsmod | grep kvm

# Se não estiver, instale:
sudo apt install qemu-kvm
sudo adduser $USER kvm
# Reinicie o computador
```

### Problema 3: "adb: device offline"
```bash
adb kill-server
adb start-server
adb devices
```

### Problema 4: App não conecta ao backend
O emulador Android não pode usar `localhost`. Use:
- **`10.0.2.2`** para emulador Android
- **IP da máquina** para device físico

Já está configurado em `/mobile/src/services/api.ts`:
```typescript
const API_URL = 'http://10.0.2.2:3000';
```

### Problema 5: "Metro bundler not found"
```bash
cd /home/shurillo/Programming/grow/mobile
npm install
npx expo start --clear
```

## Comandos Úteis

### ADB (Android Debug Bridge)
```bash
# Listar devices conectados
adb devices

# Instalar APK no emulador
adb install caminho/do/app.apk

# Ver logs do Android
adb logcat

# Ver logs do React Native
adb logcat *:S ReactNative:V ReactNativeJS:V

# Reiniciar ADB
adb kill-server && adb start-server

# Abrir shell no device
adb shell

# Enviar arquivo para o device
adb push arquivo.txt /sdcard/

# Screenshot
adb exec-out screencap -p > screenshot.png
```

### Emulador
```bash
# Listar emuladores disponíveis
emulator -list-avds

# Iniciar emulador
emulator -avd Pixel_5_API_34

# Iniciar com GPU acelerada
emulator -avd Pixel_5_API_34 -gpu host

# Iniciar em modo headless (sem UI)
emulator -avd Pixel_5_API_34 -no-window

# Limpar data do emulador
emulator -avd Pixel_5_API_34 -wipe-data
```

### Expo
```bash
# Iniciar com cache limpo
npx expo start --clear

# Iniciar no modo desenvolvimento
npx expo start --dev-client

# Build Android local
npx expo run:android

# Build Android release
npx expo run:android --variant release

# Instalar dependências nativas
npx expo install

# Corrigir dependências
npx expo doctor
```

## Atalhos no Expo

Com o Expo rodando (`npm start`):
- **`a`** - Abrir no Android
- **`i`** - Abrir no iOS
- **`w`** - Abrir no navegador
- **`r`** - Recarregar app
- **`m`** - Toggle menu
- **`j`** - Abrir debugger
- **`?`** - Mostrar ajuda

## Device Físico Android

### 1. Habilitar Modo Desenvolvedor
1. **Configurações → Sobre o telefone**
2. Toque 7 vezes em **Número da versão**
3. Modo desenvolvedor ativado!

### 2. Habilitar Depuração USB
1. **Configurações → Sistema → Opções do desenvolvedor**
2. Ative **Depuração USB**

### 3. Conectar via USB
```bash
# Conectar o celular no computador via USB
adb devices

# Se aparecer "unauthorized", aceite no celular
```

### 4. Alterar URL da API
Edite `/mobile/src/services/api.ts`:
```typescript
// Troque 10.0.2.2 pelo IP da sua máquina
const API_URL = 'http://192.168.1.100:3000';
```

Para descobrir seu IP:
```bash
hostname -I
# ou
ip addr show
```

## Checklist Pré-Teste

- [ ] Backend rodando (`./start-v2.sh`)
- [ ] Android Studio instalado
- [ ] SDK Android configurado
- [ ] Variáveis de ambiente configuradas
- [ ] Emulador criado
- [ ] ADB funcionando (`adb devices`)
- [ ] Dependências instaladas (`npm install`)
- [ ] Expo iniciado (`npm start`)

## Primeira Execução Passo a Passo

```bash
# 1. Iniciar backend
cd /home/shurillo/Programming/grow
./start-v2.sh

# 2. Em outro terminal, iniciar emulador
emulator -avd Pixel_5_API_34 &

# 3. Verificar device
adb devices
# Deve mostrar: emulator-5554   device

# 4. Iniciar Expo
cd /home/shurillo/Programming/grow/mobile
npm start

# 5. No terminal do Expo, pressione: a
# O app abrirá automaticamente no emulador!
```

## Dicas de Performance

1. **Usar hardware acelerado**: Configure GPU host no emulador
2. **Alocar RAM suficiente**: Mínimo 2GB para o emulador
3. **Usar disco SSD**: Melhora muito a velocidade
4. **Fechar apps desnecessários**: Emulador consome recursos
5. **Desabilitar animações**: No emulador, acelera testes

## Recursos Adicionais

- **Documentação Expo**: https://docs.expo.dev/
- **React Native**: https://reactnative.dev/
- **Android Studio**: https://developer.android.com/studio/intro
- **Troubleshooting Expo**: https://docs.expo.dev/troubleshooting/
- **ADB Commands**: https://developer.android.com/tools/adb

---

**Pronto!** 🚀 Agora você pode testar o app Grow no Android!
