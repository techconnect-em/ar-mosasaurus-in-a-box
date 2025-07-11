AFRAME.registerComponent("ar-controller", {
  init: function () {
    this.scanningOverlay = document.getElementById("scanning-overlay");
    this.captureButton = document.getElementById("capture");
    this.websiteButton = document.getElementById("website-button");
    this.releaseButton = document.getElementById("release-button");
    this.feedButton = document.getElementById("feed-button");
    this.dinosaurModel = this.el.querySelector("#dinosaur");
    console.log("Dinosaur model:", this.dinosaurModel);
    
    // モササウルス ステータス管理
    this.statusPanel = document.getElementById("mosa-status");
    this.happinessLevel = document.getElementById("happiness-level");
    this.hungerLevel = document.getElementById("hunger-level");
    this.feedCount = document.getElementById("feed-count");
    
    // モササウルス の状態（初期値を低めに設定）
    this.mosaStatus = {
      happiness: 50,
      hunger: 30,
      feedCount: 0,
      lastFeedTime: Date.now()
    };
    
    // 音響効果システム
    this.audioContext = null;
    this.audioInitialized = false;
    this.initAudioOnFirstInteraction();
    
    // アニメーション設定をオブジェクトの配列として管理
    this.animations = [
      { clip: "Animation", duration: 7000, timeScale: 1.0, sound: null },
    ];
    this.currentIndex = 0;
    this.isFeeding = false;

    if (this.dinosaurModel) {
      // アニメーション終了イベントリスナーを追加
      this.dinosaurModel.addEventListener('animation-finished', this.onAnimationFinished.bind(this));
      
      // モデルが読み込まれるまで待機
      this.dinosaurModel.addEventListener('model-loaded', () => {
        console.log('Mosasaurus model loaded');
        this.startContinuousAnimation();
      });
      
      // すでに読み込まれている場合もあるので、直接実行も試す
      this.startContinuousAnimation();
    }
    
    // ステータス更新タイマー
    this.startStatusUpdater();
    
    // ステータスの初期化（表示はしない）
    this.updateStatusDisplay();
    
    // ステータスパネルは初期状態で非表示
    this.statusPanel.classList.remove('visible');
    
    // カメラアクセスのデバッグ
    this.checkCameraAccess();
  },
  
  // カメラアクセス確認
  checkCameraAccess: function() {
    console.log("📹 Checking camera access...");
    
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      })
      .then(stream => {
        console.log("✅ Camera access granted");
        // ストリームを停止（MindARが管理するため）
        stream.getTracks().forEach(track => track.stop());
      })
      .catch(error => {
        console.error("❌ Camera access denied:", error);
        alert("カメラへのアクセスが必要です。ブラウザの設定でカメラを許可してください。");
      });
    } else {
      console.error("❌ getUserMedia not supported");
      alert("このブラウザはカメラアクセスに対応していません。");
    }
  },

  // 継続的なアニメーション開始
  startContinuousAnimation: function() {
    if (!this.dinosaurModel) return;
    
    console.log("🔄 Starting continuous animation");
    
    // clip名を一瞬変更してアニメーション状態をリフレッシュ
    this.dinosaurModel.setAttribute("animation-mixer", "clip", "none");
    
    // 次のフレームで正しい設定に戻す
    setTimeout(() => {
      this.dinosaurModel.setAttribute("animation-mixer", {
        clip: "*",
        loop: "repeat"
      });
      console.log("🎭 Animation refreshed and set to repeat mode");
    }, 16); // 1フレーム分の遅延
    
    // 初回のみイベントリスナーとボタンを設定
    if (!this.initialized) {
      this.createShareModal();
      this.setupEventListeners();
      this.setupButtons();
      this.initialized = true;
    }
  },

  // アニメーション終了イベントハンドラー
  onAnimationFinished: function(e) {
    console.log("🎭 Animation finished event received");
    
    if (this.isFeeding) {
      console.log("🔄 Feeding animation completed, returning to continuous animation");
      
      // フォールバックタイマーをクリア
      if (this.feedingTimeoutTimer) {
        clearTimeout(this.feedingTimeoutTimer);
        this.feedingTimeoutTimer = null;
      }
      
      this.isFeeding = false;
      this.startContinuousAnimation();
    }
  },

  // オーディオ初期化
  initAudioOnFirstInteraction: function() {
    const initAudio = () => {
      if (!this.audioInitialized) {
        try {
          this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
          if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
          }
          this.audioInitialized = true;
          console.log('🔊 Audio initialized');
        } catch (error) {
          console.log('Audio initialization error:', error);
        }
      }
    };
    
    // 最初のクリック/タッチでオーディオを初期化
    document.body.addEventListener('click', initAudio, { once: true });
    document.body.addEventListener('touchstart', initAudio, { once: true });
  },

  // 効果音の再生
  playEffectSound: function(soundType) {
    // 音響システムが初期化されていない場合は初期化を試行
    if (!this.audioInitialized) {
      try {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (this.audioContext.state === 'suspended') {
          this.audioContext.resume();
        }
        this.audioInitialized = true;
        console.log('🔊 Audio initialized on sound play');
      } catch (error) {
        console.log('Audio initialization error:', error);
        return;
      }
    }
    
    if (!this.audioContext || !this.audioInitialized) return;
    
    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      switch(soundType) {
        case 'heart':
          // ハートエフェクト用の優しい音
          oscillator.frequency.setValueAtTime(523, this.audioContext.currentTime); // C5
          oscillator.frequency.exponentialRampToValueAtTime(659, this.audioContext.currentTime + 0.1); // E5
          oscillator.frequency.exponentialRampToValueAtTime(784, this.audioContext.currentTime + 0.2); // G5
          gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
          oscillator.type = 'sine';
          oscillator.start();
          oscillator.stop(this.audioContext.currentTime + 0.5);
          break;
          
        case 'eating':
          // 餌やり用の上昇音（ハートとは違う音階）
          oscillator.frequency.setValueAtTime(220, this.audioContext.currentTime); // A3
          oscillator.frequency.exponentialRampToValueAtTime(294, this.audioContext.currentTime + 0.1); // D4
          oscillator.frequency.exponentialRampToValueAtTime(392, this.audioContext.currentTime + 0.2); // G4
          oscillator.frequency.exponentialRampToValueAtTime(523, this.audioContext.currentTime + 0.3); // C5
          gainNode.gain.setValueAtTime(0.18, this.audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
          oscillator.type = 'triangle';
          oscillator.start();
          oscillator.stop(this.audioContext.currentTime + 0.5);
          break;
      }
      
    } catch (error) {
      console.log("Sound error:", error);
    }
  },
  
  // モササウルス の餌やり機能
  feedMosa: function() {
    if (this.isFeeding) {
      console.log("⚠️ Feeding already in progress, ignoring");
      return; // 餌やり中は重複実行を防ぐ
    }
    
    console.log("🐟 Starting feeding animation");
    this.isFeeding = true;
    this.mosaStatus.feedCount++;
    this.mosaStatus.hunger = Math.min(100, this.mosaStatus.hunger + 15);
    this.mosaStatus.happiness = Math.min(100, this.mosaStatus.happiness + 5);
    this.mosaStatus.lastFeedTime = Date.now();
    
    // 既存のアニメーションタイマーをクリア
    if (this.animationTimer) {
      clearTimeout(this.animationTimer);
      this.animationTimer = null;
    }
    
    // フォールバックタイマー: 5秒後に強制的にisFeedingをリセット
    if (this.feedingTimeoutTimer) {
      clearTimeout(this.feedingTimeoutTimer);
    }
    this.feedingTimeoutTimer = setTimeout(() => {
      if (this.isFeeding) {
        console.log("⚠️ Feeding timeout - force resetting isFeeding flag");
        this.isFeeding = false;
        this.startContinuousAnimation();
      }
    }, 5000); // 5秒のタイムアウト
    
    // 餌やりアニメーション（一度だけ再生）
    this.dinosaurModel.setAttribute("animation-mixer", "loop", "once");
    
    // 餌やりエフェクトの表示（魚エモジ）
    this.showFeedingEffect();
    
    // 餌やり効果音の再生
    this.playEffectSound('eating');
    
    // ステータス表示の更新
    this.updateStatusDisplay();
    
    // 注意: アニメーション終了はonAnimationFinishedイベントで処理される
  },
  
  // 餌やりエフェクトの表示
  showFeedingEffect: function() {
    // 魚のエモジエフェクト（海洋生物なので）
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const effect = document.createElement('div');
        effect.className = 'feeding-effect';
        effect.textContent = '🐟';
        effect.style.left = (50 + Math.random() * 20 - 10) + '%';
        effect.style.top = (50 + Math.random() * 20 - 10) + '%';
        document.body.appendChild(effect);
        
        setTimeout(() => {
          document.body.removeChild(effect);
        }, 1500);
      }, i * 200);
    }
    
    // パーティクルエフェクト
    this.createParticles();
  },
  
  // パーティクルエフェクトの作成
  createParticles: function() {
    const colors = ['#00BFFF', '#1E90FF', '#4682B4', '#87CEEB'];
    
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = (50 + Math.random() * 30 - 15) + '%';
        particle.style.top = '60%';
        particle.style.width = '8px';
        particle.style.height = '8px';
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        particle.style.animation = 'particleFloat 2s ease-out forwards';
        document.body.appendChild(particle);
        
        setTimeout(() => {
          document.body.removeChild(particle);
        }, 2000);
      }, i * 100);
    }
  },
  
  // ステータス表示の更新
  updateStatusDisplay: function() {
    // デバッグ情報を表示
    console.log(`📊 Status Update: Happiness=${this.mosaStatus.happiness}, Hunger=${this.mosaStatus.hunger}, FeedCount=${this.mosaStatus.feedCount}`);
    
    // 幸福度の表示（絵文字 + 数値）
    let happinessEmoji = '';
    if (this.mosaStatus.happiness > 80) {
      happinessEmoji = '😄';
      console.log('😄 Very Happy');
    } else if (this.mosaStatus.happiness > 60) {
      happinessEmoji = '😊';
      console.log('😊 Happy');
    } else if (this.mosaStatus.happiness > 40) {
      happinessEmoji = '😐';
      console.log('😐 Neutral');
    } else if (this.mosaStatus.happiness > 20) {
      happinessEmoji = '😢';
      console.log('😢 Sad');
    } else {
      happinessEmoji = '😭';
      console.log('😭 Very Sad');
    }
    
    this.happinessLevel.textContent = `${happinessEmoji} ${this.mosaStatus.happiness}%`;
    
    // 空腹度の表示（7個の魚メーター）
    const fishCount = Math.ceil(this.mosaStatus.hunger / (100 / 7));
    let hungerDisplay = '';
    
    if (this.mosaStatus.hunger <= 0) {
      hungerDisplay = '💀';
      console.log('💀 Starving');
    } else {
      for (let i = 0; i < fishCount; i++) {
        hungerDisplay += '🐟';
      }
      console.log(`🐟x${fishCount} Hunger Level: ${this.mosaStatus.hunger}`);
    }
    
    this.hungerLevel.textContent = hungerDisplay;
    
    // 餌やり回数
    this.feedCount.textContent = this.mosaStatus.feedCount;
    
    // ステータスパネルにポップアップ効果を追加
    this.statusPanel.style.transform = 'scale(1.05)';
    setTimeout(() => {
      this.statusPanel.style.transform = 'scale(1)';
    }, 200);
  },
  
  // ステータス自動更新システム
  startStatusUpdater: function() {
    setInterval(() => {
      const now = Date.now();
      const timeSinceLastFeed = now - this.mosaStatus.lastFeedTime;
      
      // 時間経過による空腹度と幸福度の減少
      if (timeSinceLastFeed > 60000) { // 60秒毎
        this.mosaStatus.hunger = Math.max(0, this.mosaStatus.hunger - 1);
        this.mosaStatus.happiness = Math.max(0, this.mosaStatus.happiness - 1);
        this.mosaStatus.lastFeedTime = now;
        
        if (this.statusPanel.classList.contains('visible')) {
          this.updateStatusDisplay();
        }
      }
    }, 10000); // 10秒毎にチェック
  },

  setupEventListeners: function () {
    // MindAR初期化のデバッグログ
    console.log("🔍 Setting up AR event listeners");
    
    this.el.addEventListener("targetFound", () => {
      console.log("✅ マーカーを認識しました");
      if (this.scanningOverlay) {
        this.scanningOverlay.style.display = "none";
      }
      // ステータスパネルを表示
      this.statusPanel.classList.add('visible');
    });

    this.el.addEventListener("targetLost", () => {
      console.log("マーカーを見失いました");
      if (this.scanningOverlay) {
        this.scanningOverlay.style.display = "block";
      }
      // ステータスパネルを隠す
      this.statusPanel.classList.remove('visible');
    });
    
    // モササウルスモデルへの直接クリックイベント
    if (this.dinosaurModel) {
      console.log("Setting up Mosasaurus click listeners");
      this.dinosaurModel.addEventListener('click', (e) => {
        console.log('Mosasaurus clicked!');
        this.petMosa();
      });
      
      // A-Frameのカーソルイベントも追加
      this.dinosaurModel.addEventListener('mouseenter', () => {
        console.log('Mouse entered Mosasaurus');
        this.dinosaurModel.setAttribute('material', 'color', '#aaeeff');
      });
      
      this.dinosaurModel.addEventListener('mouseleave', () => {
        console.log('Mouse left Mosasaurus');
        this.dinosaurModel.removeAttribute('material');
      });
    } else {
      console.log("Dinosaur model not found!");
    }
    
    // タッチインタラクション（タップのみ）
    this.setupTouchInteraction();
    
    // デバッグ用の全体クリックイベント
    document.addEventListener('click', (e) => {
      console.log('Global click detected at:', e.clientX, e.clientY);
      
      // 画面の中央付近をクリックした場合はモササウルスをタップしたとみなす
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const centerX = screenWidth / 2;
      const centerY = screenHeight / 2;
      
      // 中央から300px以内のクリックはモササウルスのタップとして処理（範囲を拡大）
      if (Math.abs(e.clientX - centerX) < 300 && Math.abs(e.clientY - centerY) < 300) {
        console.log('🎯 Mosasaurus area clicked!');
        this.petMosa();
      }
    });
  },
  
  // タッチインタラクション（タップのみ）
  setupTouchInteraction: function() {
    const scene = document.querySelector('a-scene');
    let touchStartTime = 0;
    
    scene.addEventListener('touchstart', (e) => {
      touchStartTime = Date.now();
    });
    
    scene.addEventListener('touchend', (e) => {
      const touchEndTime = Date.now();
      const deltaTime = touchEndTime - touchStartTime;
      
      // 短いタップ（500ms以下）のみ処理
      if (deltaTime < 500) {
        console.log('Touch tap detected');
        
        // 中央付近のタップはモササウルスのタップとして処理
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const centerX = screenWidth / 2;
        const centerY = screenHeight / 2;
        
        if (Math.abs(touchEndX - centerX) < 300 && Math.abs(touchEndY - centerY) < 300) {
          console.log('🎯 Mosasaurus touch tap detected!');
          this.petMosa();
        }
      }
    });
  },
  
  // モササウルスを撫でる（タップ）
  petMosa: function() {
    if (this.isSpecialAnimation) return; // 特別なアニメーション中は重複実行を防ぐ
    
    console.log("💙 モササウルス をタップしました");
    this.isSpecialAnimation = true;
    this.mosaStatus.happiness = Math.min(100, this.mosaStatus.happiness + 5);
    
    // アニメーションは一切変更せず、継続させる
    // ハートエフェクト
    this.showHeartEffect();
    
    // ハート効果音の再生
    this.playEffectSound('heart');
    
    // ステータス表示の更新
    this.updateStatusDisplay();
    
    // 0.5秒後にフラグをリセット（アニメーションには影響しない）
    setTimeout(() => {
      this.isSpecialAnimation = false;
      console.log("💙 Petting completed - animation never stopped");
    }, 500);
    
  },
  
  
  // ハートエフェクト
  showHeartEffect: function() {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const heart = document.createElement('div');
        heart.className = 'feeding-effect';
        heart.textContent = '💙';
        heart.style.left = (40 + Math.random() * 20) + '%';
        heart.style.top = (35 + Math.random() * 20) + '%';
        document.body.appendChild(heart);
        
        setTimeout(() => {
          document.body.removeChild(heart);
        }, 1500);
      }, i * 150);
    }
  },

  createShareModal: function () {
    const modalHTML = `
            <div id="share-modal" class="share-modal hidden">
                <div class="modal-content">
                    <div class="image-container">
                        <img id="captured-image" class="captured-image">
                    </div>
                    <p class="save-text">画像長押しで保存できます</p>
                    <div class="modal-buttons">
                        <button id="share-button" class="modal-btn share-btn">共有する</button>
                        <button id="close-modal" class="modal-btn close-btn">閉じる</button>
                    </div>
                </div>
            </div>
        `;
    document.body.insertAdjacentHTML("beforeend", modalHTML);

    this.shareModal = document.getElementById("share-modal");
    this.capturedImage = document.getElementById("captured-image");
    this.shareButton = document.getElementById("share-button");
    this.closeModal = document.getElementById("close-modal");
  },

  setupButtons: function () {
    if (this.captureButton) {
      this.captureButton.addEventListener("click", async () => {
        const scene = document.querySelector("a-scene");

        // キャプチャ前にデフォルトのダウンロード動作を防ぐための設定
        const originalGetCanvas = scene.components.screenshot.getCanvas;
        scene.components.screenshot.getCanvas = function () {
          const canvas = originalGetCanvas.apply(this, arguments);
          // デフォルトのダウンロードポップアップを防ぐ
          canvas.toBlob = function () {};
          return canvas;
        };

        // A-Frameシーンのスクリーンショットを取得
        const sceneCanvas =
          scene.components.screenshot.getCanvas("perspective");

        const video = document.querySelector("video");

        // 最終的なキャプチャ用キャンバスを作成
        const finalCanvas = document.createElement("canvas");
        finalCanvas.width = window.innerWidth;
        finalCanvas.height = window.innerHeight;
        const ctx = finalCanvas.getContext("2d");

        // 背景（カメラ映像）を描画
        if (video) {
          ctx.drawImage(video, 0, 0, finalCanvas.width, finalCanvas.height);
        }

        // A-Frameシーン（3Dモデル）を重ねて描画
        if (sceneCanvas) {
          ctx.drawImage(
            sceneCanvas,
            0,
            0,
            finalCanvas.width,
            finalCanvas.height
          );
        }

        // キャプチャした画像データをモーダルに表示
        this.capturedImage.src = finalCanvas.toDataURL("image/png");
        this.shareModal.classList.remove("hidden");

        // 元のgetCanvas関数を復元
        scene.components.screenshot.getCanvas = originalGetCanvas;
      });

      // シェアボタンの処理
      if (this.shareButton) {
        this.shareButton.addEventListener("click", async () => {
          try {
            // キャプチャした画像をBlobに変換
            const response = await fetch(this.capturedImage.src);
            const blob = await response.blob();
            const file = new File([blob], "ar-capture.png", {
              type: "image/png",
            });

            // Web Share APIを使用
            if (navigator.share) {
              await navigator.share({
                files: [file],
                title: "AR Capture",
                text: "Check out my AR capture!",
              });
            } else {
              // シェアAPI非対応の場合はダウンロード
              const link = document.createElement("a");
              link.href = this.capturedImage.src;
              link.download = "ar-capture.png";
              link.click();
            }
          } catch (error) {
            console.error("Failed to share:", error);
          }
        });
      }
      // 閉じるボタンの処理
      if (this.closeModal) {
        this.closeModal.addEventListener("click", () => {
          this.shareModal.classList.add("hidden");
        });
      }

      // モーダル外クリックで閉じる
      this.shareModal.addEventListener("click", (event) => {
        if (event.target === this.shareModal) {
          this.shareModal.classList.add("hidden");
        }
      });
    }

    // Webサイトボタンの処理
    if (this.websiteButton) {
      this.websiteButton.addEventListener("click", () => {
        window.open("https://www.instagram.com/techconnect.em/", "_blank");
      });
    }

    // 外に出すボタンの処理
    if (this.releaseButton) {
      this.releaseButton.addEventListener('click', () => {
        window.location.href = 'https://palanar.com/ar_contents/mosasaurus_rolling';
      });
    }
    
    // 餌やりボタンの処理
    if (this.feedButton) {
      this.feedButton.addEventListener('click', (e) => {
        e.stopPropagation(); // 他のクリックイベントを止める
        this.feedMosa();
      });
    }
  },
});

// トレーディングカード機能
document.addEventListener('DOMContentLoaded', function() {
  const showCardButton = document.getElementById('show-card-button');
  const cardContainer = document.getElementById('card-container');
  const closeCardButton = document.getElementById('close-card-button');

  // 豆知識のランダムコンテンツ（複数LLMファクトチェック済み・科学的事実に基づく）
  const triviaContent = [
    "モササウルスは海に住む巨大なトカゲの仲間で、「マース川のトカゲ」という意味の名前を持っているよ。この名前は、最初の化石がオランダのマース川で見つかったことから付けられたんだ。ヒレのような足で海をビューンと泳ぎ、サメやウミガメ、アンモナイトなどの海の生き物を食べていたよ。鋭い歯で獲物をしっかりつかみ、サメのように尻尾を左右に振って泳ぐ、まさに海のスーパーハンターだったんだね！",
    "モササウルスの目はとても大きくて、暗い海の底でも獲物を見つけることができたんだ。鼻の穴が頭の上の方にあったのもとても便利で、息をするときに体全体を水面まで持ち上げなくても、鼻の穴だけをチョコンと出せば呼吸できたよ。これは現在のクジラやイルカの呼吸方法とよく似ているんだ。",
    "モササウルスの歯は、まるでベルトコンベアのように一生の間に何度も生え変わったんだ。古い歯が抜けても、その下からピカピカの新しい歯がどんどん生えてきて、いつでも鋭い歯で獲物を捕まえることができたよ。この仕組みはサメの歯とよく似ていて、海のハンターとしての強さの秘密だったんだね。",
    "モササウルスの祖先は、もともと陸に住んでいたトカゲに近い動物だったんだ。それが長い時間をかけて海で暮らせるように進化していったんだよ。だから骨格をよく見ると、陸に住んでいた頃の特徴が残っているんだ。足は泳ぎやすいヒレの形に変化して、陸から海への大冒険を成功させた、すごい動物なんだね！",
    "モササウルスの化石は世界中で見つかっているよ。日本でも発見されていて、特に北海道のむかわ町や和歌山県で見つかっているんだ。当時の海は今よりもずっと暖かくて、モササウルスが暮らしやすい環境だったんだね。もしかしたら、みんなの住んでいる場所の近くの海にも、モササウルスの化石が眠っているかもしれないよ！"
  ];

  // カードを表示する関数
  function showCard() {
    if (cardContainer) {
      // ランダムに豆知識を選択
      const randomTrivia = triviaContent[Math.floor(Math.random() * triviaContent.length)];
      const triviaElement = document.querySelector('.dino-trivia p');
      if (triviaElement) {
        triviaElement.textContent = randomTrivia;
      }
      
      cardContainer.classList.remove('hidden');
      cardContainer.style.display = 'flex'; // 強制的に表示
    }
  }

  // カードを非表示にする関数
  function hideCard() {
    if (cardContainer) {
      cardContainer.classList.add('hidden');
    }
  }

  // イベントリスナーの設定
  if (showCardButton) {
    showCardButton.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      showCard();
    });
  }
  
  if (closeCardButton) {
    closeCardButton.addEventListener('click', hideCard);
  }

  // カードの外側（背景）をクリックした時に閉じる
  if (cardContainer) {
    cardContainer.addEventListener('click', (event) => {
      if (event.target === cardContainer) {
        hideCard();
      }
    });
  }
});


