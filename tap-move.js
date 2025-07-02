AFRAME.registerComponent('tap-move', {
  init() {
    // モデルとアンカー
    this.dino   = document.getElementById('dinosaur');
    this.anchor = this.dino.parentEl;               // <a-entity mindar-image-target>

    // クリック (= タップ) は "touch-plane" に付ける方が確実
    const touchPlane = this.anchor.querySelector('.touch-plane');

    touchPlane.addEventListener('click', (e) => {
      const worldP = e.detail.intersection.point.clone(); // ワールド座標
      const localP = worldP;                              // このあと変換

      // ワールド → アンカーのローカル座標へ変換
      this.anchor.object3D.worldToLocal(localP);

      // 既存アニメを消す → 新規アニメ
      this.dino.removeAttribute('animation__move');
      this.dino.setAttribute('animation__move', {
        property: 'position',
        to: `${localP.x} ${localP.y} ${localP.z}`,
        dur: 1000,
        easing: 'easeInOutQuad'
      });
    });
  }
});
