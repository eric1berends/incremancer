Humans = {

  map : Map,
  maxWalkSpeed : 15,
  maxRunSpeed : 35,
  minSecondsTostand : 1,
  maxSecondsToStand : 60, // 60
  chanceToStayInCurrentBuilding : 0.95, // 0.95
  textures : [],
  doctorTextures :[],
  doctorDeadTexture : {},
  humans : [],
  discardedHumans : [],
  aliveHumans : [],
  humansPerLevel : 50, // 50
  maxHumans : 1000, // 1000
  scaling: 2,
  visionDistance : 60,
  fleeChancePerZombie : 0.1,
  fleeTime : 10,
  scanTime : 3,
  attackDistance : 20,
  moveTargetDistance : 3,
  attackSpeed : 2,
  attackDamage : 5,
  fadeSpeed : 0.1,
  plagueTickTimer : 5,
  healTickTimer : 4,
  fastDistance:fastDistance,
  frozen : false,

  graveYardPosition : {},

  states : {
    standing:"standing",
    walking:"walking",
    attacking:"attacking",
    fleeing:"fleeing"
  },

  randomSecondsToStand() {
    return this.minSecondsTostand + Math.random() * (this.maxSecondsToStand - this.minSecondsTostand);
  },

  damageHuman(human, damage) {
    GameModel.addBlood(Math.round(damage / 3));
    human.health -= damage;
    Blood.newSplatter(human.x, human.y);
    human.timeToScan = 0;
    human.speedMod = Math.max(Math.min(1, human.health / human.maxHealth), 0.25);
    if (human.health <= 0 && !human.dead) {
      Bones.newBones(human.x, human.y);
      human.dead = true;
      GameModel.addBrains(1);
      human.textures = human.deadTexture;
    }
  },

  assignRandomTarget(human) {
    if (Math.random() > this.chanceToStayInCurrentBuilding || human.timeFleeing > 0) {
      human.currentPoi = this.map.getRandomBuilding();
    }
    human.target = this.map.randomPositionInBuilding(human.currentPoi);
    human.maxSpeed = human.timeFleeing > 0 ? this.maxRunSpeed : this.maxWalkSpeed;
    human.xSpeed = 0;
    human.ySpeed = 0;
  },

  getMaxHumans() {
    return Math.min(this.humansPerLevel * GameModel.level, this.maxHumans) - (Police.getMaxPolice() + Army.getMaxArmy());
  },

  getMaxDoctors() {
    var maxDoctors = Math.min(Math.round(0.7 * GameModel.level), 75);

    if (GameModel.level < 14)
      return 0;

    return maxDoctors;
  },

  getTorchChance() {
    if (GameModel.level < 10)
      return 0;
    
    return Math.min(GameModel.level - 10, 10) * 0.05;
  },

  getMaxHealth(level) {
    if (level < 7) {
      return (level + 4) * 10;
    }
    if (level < 12) {
      return (level -1) * 20;
    }
    if (level < 16) {
      return (level - 3) * 25;
    }
    if (level < 29) {
      return (level - 9) * 50;
    }
    if (level < 49) {
      return (level - 19) * 100;
    }
    if (level < 64) {
      return (level - 29) * 150;
    }
    if (level < 78) {
      return (level - 37) * 200;
    }
    if (level < 85) {
      return (level - 45) * 250;
    }
    if (level < 92) {
      return (level - 52) * 300;
    }
    return (level - 68) * 500;
  },

  getAttackDamage() {
    if (GameModel.level == 1) {
      this.attackDamage = 4;
      return;
    }
    if (GameModel.level == 2) {
      this.attackDamage = 5;
      return;
    }
    this.attackDamage = Math.round(this.getMaxHealth(GameModel.level) / 10);
  },

  populate() {
    
    this.map.populatePois();

    if (this.textures.length == 0) {
      for (var i=0; i < 6; i++) {
        var animated = [];
        for (var j=0; j < 3; j++) {
          animated.push(PIXI.Texture.from('human' + (i + 1) + '_' + (j + 1) + '.png'));
        }
        this.textures.push({
          animated : animated,
          dead : [PIXI.Texture.from('human' + (i + 1) + '_dead.png')]
        })
      }
    }
    if (this.doctorTextures.length == 0) {
      for (var i=0; i < 3; i++) {
        this.doctorTextures.push(PIXI.Texture.from('doctor' + (i + 1) + '.png'))
      }
      this.doctorDeadTexture = [PIXI.Texture.from('doctor4.png')];
    }

    if (this.humans.length > 0) {
      for (var i=0; i < this.humans.length; i++) {
        characterContainer.removeChild(this.humans[i]);
        this.humans[i].stop();
      }
      this.discardedHumans = this.humans.slice();;
      this.humans.length = 0;
      this.aliveHumans.length = 0;
    }

    this.getAttackDamage();
    var maxHumans = this.getMaxHumans();
    var numDoctors = this.getMaxDoctors();
    var maxHealth = this.getMaxHealth(GameModel.level);
  
    for (var i=0; i < maxHumans; i++) {
      var human;
      if (numDoctors > 0) {
        if (this.discardedHumans.length > 0) {
          human = this.discardedHumans.pop();
          human.textures = this.doctorTextures;
        } else {
          human = new PIXI.AnimatedSprite(this.doctorTextures);
        }
        human.deadTexture = this.doctorDeadTexture;
        human.doctor = true;
        human.torchBearer = false;
        human.healTickTimer = Math.random() * this.healTickTimer;
        numDoctors--;
      } else {
        var torchBearer = Math.random() < this.getTorchChance();
        var textureId = Math.floor(Math.random() * 3) + (torchBearer ? 3 : 0);
        if (this.discardedHumans.length > 0) {
          human = this.discardedHumans.pop();
          human.textures = this.textures[textureId].animated;
        } else {
          human = new PIXI.AnimatedSprite(this.textures[textureId].animated);
        }
        human.torchBearer = torchBearer;
        human.deadTexture = this.textures[textureId].dead;
        human.doctor = false;
      }
      human.dead = false;
      human.animationSpeed = 0.15;
      human.anchor = {x:35/80,y:1};
      human.currentPoi = this.map.getRandomBuilding();
      human.position = this.map.randomPositionInBuilding(human.currentPoi);
      human.zIndex = human.position.y;
      human.xSpeed = 0;
      human.ySpeed = 0;
      human.plagueTickTimer = Math.random() * this.plagueTickTimer;
      human.target = false;
      human.speedMod = 1;
      human.zombieTarget = false;
      human.infected = false;
      human.lastKnownBuilding = false;
      human.plagueDamage = 0;
      human.visionDistance = this.visionDistance;
      human.visible = true;
      human.alpha = 1;
      human.maxHealth = human.health = maxHealth;
      human.timeToScan = Math.random() * this.scanTime;
      human.timeFleeing = 0;
      this.changeState(human, this.states.standing);
      human.timeStanding = Math.random() * this.randomSecondsToStand();
      human.attackTimer = this.attackSpeed;
      human.scale = {x:Math.random() > 0.5 ? this.scaling : -1 * this.scaling, y:this.scaling};
      this.humans.push(human);
      characterContainer.addChild(human);
    }

    Police.populate();
    Army.populate();
  },

  updateHumanSpeed(human, timeDiff) {

    if (this.frozen) {
      human.gotoAndStop(0);
      return;
    } else {
      if (!human.playing) {
        human.play();
      }
    }
    if (!human.targetTimer || !human.targetVector) {
      human.targetTimer = 0;
    }
    human.targetTimer-=timeDiff;
    if (human.targetTimer <= 0) {
      human.targetVector = this.map.howDoIGetToMyTarget(human, human.target);
      human.targetTimer = 0.2;
    }

    var ax = Math.abs(human.targetVector.x);
    var ay = Math.abs(human.targetVector.y);
    if (Math.max(ax, ay) == 0)
      return;
    var ratio = 1 / Math.max(ax, ay);
    ratio = ratio * (1.29289 - (ax + ay) * ratio * 0.29289);

    var humanSpeedMod = human.speedMod * ratio * human.maxSpeed;
    
    human.xSpeed = human.targetVector.x * humanSpeedMod;
    human.ySpeed = human.targetVector.y * humanSpeedMod;

    human.position.x += human.xSpeed * timeDiff;
    human.position.y += human.ySpeed * timeDiff;
    human.zIndex = human.position.y;
    if (Math.abs(human.xSpeed) > 1)
      human.scale.x = human.xSpeed > 0 ? this.scaling : -this.scaling;
  },

  drawTargets : false,

  update(timeDiff) {
    var aliveHumans = [];
    var aliveZombies = Zombies.aliveZombies;
    for (var i=0; i < this.humans.length; i++) {
      this.updateHuman(this.humans[i], timeDiff, aliveZombies);
      if (!this.humans[i].dead)
        aliveHumans.push(this.humans[i]);
    }
    this.aliveHumans = aliveHumans;
    Police.update(timeDiff, aliveZombies);
    Army.update(timeDiff, aliveZombies);
    GameModel.humanCount = this.aliveHumans.length;
  },

  updateDeadHumanFading(human, timeDiff) {
    if (!human.visible)
      return;
  
    if (human.alpha > 0.5 && human.alpha - this.fadeSpeed * timeDiff <= 0.5) {
      if (Math.random() < GameModel.riseFromTheDeadChance) {
        Zombies.createZombie(human.x, human.y);
        human.visible = false;
        characterContainer.removeChild(human);
        return;
      }
    }
    human.alpha -= this.fadeSpeed * timeDiff;

    if (human.alpha < 0) {
      human.visible = false;
      characterContainer.removeChild(human);
    }
    return;
  },

  changeState(human, state) {
    switch(state) {
      case this.states.standing:
        human.gotoAndStop(0);
        human.maxSpeed = this.maxWalkSpeed;
        human.timeStanding = Humans.randomSecondsToStand();
        break;
      case this.states.walking:
        human.play();
        human.maxSpeed = this.maxWalkSpeed;
        break;
      case this.states.fleeing:
        human.play();
        human.timeFleeing = this.fleeTime;
        human.maxSpeed = this.maxRunSpeed;
        this.assignRandomTarget(human);
        Exclamations.newExclamation(human);
        break;
      case this.states.attacking:
        human.play();
        human.maxSpeed = this.maxRunSpeed;
        break;
    }
    human.state = state;
  },


  inflictBurn(human, zombie) {
    if (human.torchBearer) {
      if (!zombie.burning) {
        Exclamations.newFire(zombie);
        zombie.burnDamage = this.attackDamage;
      } else {
        zombie.burnDamage += this.attackDamage;
      }
      zombie.burning = true;
    }
  },

  updatePlague(human, timeDiff) {
    human.plagueTickTimer -= timeDiff;

    if (human.plagueTickTimer < 0) {
      this.damageHuman(human, human.plagueDamage);
      human.plagueTickTimer = this.plagueTickTimer;
      Exclamations.newPoison(human);
      human.plagueTicks--;
      if (human.plagueTicks <= 0) {
        human.infected = false;
        human.plagueDamage = 0;
      }
    }
  },

  healHuman(human) {
    if (human.health < human.maxHealth) {
      human.infected = false;
      human.plagueDamage = 0;
      human.health += this.attackDamage * 2;
      if (human.health > human.maxHealth) {
        human.health = human.maxHealth;
        human.speedMod = Math.max(Math.min(1, human.health / human.maxHealth), 0.25);
      }
      Exclamations.newHealing(human);
    }
  },

  doHeal(human, timeDiff) {
    human.healTickTimer -= timeDiff;
    if (human.healTickTimer < 0) {
      var healRadius = 100;
      human.healTickTimer = this.healTickTimer;
      for (var i = 0; i < this.aliveHumans.length; i++) {
        if (Math.abs(this.aliveHumans[i].x - human.x) < healRadius) {
          if (Math.abs(this.aliveHumans[i].y - human.y) < healRadius) {
            if (this.fastDistance(human.x, human.y, this.aliveHumans[i].x, this.aliveHumans[i].y) < healRadius) {
              this.healHuman(this.aliveHumans[i]);
            }
          }
        }
      }
    }
  },

  updateHuman(human, timeDiff, aliveZombies) {
    
    if (human.dead)
      return this.updateDeadHumanFading(human, timeDiff);

    human.attackTimer -= timeDiff;
    human.timeToScan -= timeDiff;
    human.timeFleeing -= timeDiff;

    if (human.infected)
      this.updatePlague(human, timeDiff);
    if (human.doctor)
      this.doHeal(human, timeDiff);

    if ((!human.zombieTarget || human.zombieTarget.dead) && human.timeToScan < 0) {
      var count = Humans.scanForZombies(human, aliveZombies);

      if (count > 0) {
        if (Math.random() < count * this.fleeChancePerZombie) {
          this.changeState(human, this.states.fleeing);
        } else {
          human.target = human.zombieTarget;
          this.changeState(human, this.states.attacking);
        }
      }
    }

    switch (human.state) {
      case this.states.standing:
        human.timeStanding -= timeDiff;
        if (human.timeStanding < 0) {
          this.assignRandomTarget(human);
          this.changeState(human, this.states.walking);
        }
        break;
      case this.states.walking:
      case this.states.fleeing:
        if (this.fastDistance(human.position.x, human.position.y, human.target.x, human.target.y) < this.moveTargetDistance) {
          human.target = false;
          human.zombieTarget = false;
          this.changeState(human, this.states.standing);
        } else {
          Humans.updateHumanSpeed(human, timeDiff);
        }
        break;
      case this.states.attacking:
        human.scale.x = human.target.x > human.x ? this.scaling : -this.scaling;
        if (human.zombieTarget && !human.zombieTarget.dead) {
          var distanceToTarget = this.fastDistance(human.position.x, human.position.y, human.target.x, human.target.y);
          if (distanceToTarget < this.attackDistance) {
            if (human.attackTimer < 0) {
              Zombies.damageZombie(human.zombieTarget, this.attackDamage, human);
              this.inflictBurn(human, human.zombieTarget);
              human.attackTimer = this.attackSpeed;
            }
          } else {
            Humans.updateHumanSpeed(human, timeDiff);
          }
        } else {
          this.changeState(human, this.states.standing);
        }
        break;
    }
  },

  scanForZombies(human, aliveZombies) {
    human.timeToScan = this.scanTime;
    zombieSpottedCount = 0;
    for (var i = 0; i < aliveZombies.length; i++) {
      if (!aliveZombies[i].dead) {
        if (Math.abs(aliveZombies[i].x - human.x) < human.visionDistance) {
          if (Math.abs(aliveZombies[i].y - human.y) < human.visionDistance) {
            human.zombieTarget = aliveZombies[i];
            zombieSpottedCount++;
          }
        }
      }
    }
    return zombieSpottedCount;
  }
};

Police = {
  map:Map,
  maxWalkSpeed : 15,
  maxRunSpeed : 40,
  police : [],
  discardedPolice : [],
  walkTexture : [],
  deadTexture :[],
  policePerLevel : 1,
  attackSpeed : 2,
  attackDamage : 16,
  attackDistance : 20,
  moveTargetDistance : 5,
  shootDistance : 100,
  visionDistance : 150,
  scaling :2,
  radioTime : 30,

  states : {
    shooting : "shooting",
    attacking : "attacking",
    walking : "walking",
    running : "running",
    standing : "standing"
  },

  getMaxPolice() {
    var maxPolice = Math.min(Math.round(this.policePerLevel * GameModel.level), 100);

    if (GameModel.level < 3)
      return 0;

    return maxPolice;
  },

  getMaxHealth() {
    return Math.round(Humans.getMaxHealth(GameModel.level) * 1.5);
  },

  getAttackDamage() {
    this.attackDamage = Math.round(this.getMaxHealth() / 10);
  },

  populate() {
    if (this.walkTexture.length == 0) {
      for (var i=0; i < 3; i++) {
        this.walkTexture.push(PIXI.Texture.from('cop' + (i + 1) + '.png'))
      }
      this.deadTexture = [PIXI.Texture.from('cop4.png')];
    }

    if (this.police.length > 0) {
      for (var i=0; i < this.police.length; i++) {
        characterContainer.removeChild(this.police[i]);
      }
      this.discardedPolice = this.police.slice();
      this.police = [];
    }

    var maxPolice = this.getMaxPolice();
    var maxHealth = this.getMaxHealth();
    this.getAttackDamage();

    for (var i=0; i < maxPolice; i++) {
      var police;
      if (this.discardedPolice.length > 0) {
        police = this.discardedPolice.pop();
        police.alpha = 1;
        police.textures = this.walkTexture;
      } else {
        police = new PIXI.AnimatedSprite(this.walkTexture);
      }
      police.deadTexture = this.deadTexture;
      police.animationSpeed = 0.2;
      police.anchor = {x:35/80,y:1};
      police.currentPoi = this.map.getRandomBuilding();
      police.position = this.map.randomPositionInBuilding(police.currentPoi);
      police.zIndex = police.position.y;
      police.xSpeed = 0;
      police.ySpeed = 0;
      police.radioTime = 5;
      police.speedMod = 1;
      police.dead = false;
      police.infected = false;
      police.lastKnownBuilding = false;
      police.plagueDamage = 0;
      police.plagueTickTimer = Math.random() * Humans.plagueTickTimer;
      police.maxSpeed = this.maxWalkSpeed;
      police.visionDistance = this.visionDistance;
      police.visible = true;
      police.maxHealth = police.health = maxHealth;
      police.timeToScan = Math.random() * Humans.scanTime;
      police.timeStanding = Math.random() * Humans.randomSecondsToStand();
      police.target = false;
      police.zombieTarget = false;
      police.state = this.states.standing;
      police.attackTimer = this.attackSpeed;
      police.scale = {x:Math.random() > 0.5 ? this.scaling : -1 * this.scaling, y:this.scaling};
      this.police.push(police);
      characterContainer.addChild(police);
    }
  },

  update(timeDiff, aliveZombies) {
    for (var i=0; i < this.police.length; i++) {
      this.updatePolice(this.police[i], timeDiff, aliveZombies);
      if (!this.police[i].dead)
        Humans.aliveHumans.push(this.police[i]);
    }
  },

  decideStateOnZombieDistance(police) {
    if (police.zombieTarget && !police.zombieTarget.dead) {
      police.target = police.zombieTarget;
      var distanceToTarget = fastDistance(police.position.x, police.position.y, police.zombieTarget.x, police.zombieTarget.y);

      if (distanceToTarget > this.shootDistance) {
        this.changeState(police, this.states.running);
        return;
      }

      if (distanceToTarget < this.attackDistance) {
        this.changeState(police, this.states.attacking);
        return;
      }
      this.changeState(police, this.states.shooting);
    }
  },

  changeState(police, state) {
    switch(state) {
      case this.states.standing:
        police.gotoAndStop(0);
        break;
      case this.states.walking:
        police.play();
        police.maxSpeed = this.maxWalkSpeed;
        break;
      case this.states.running:
        police.play();
        police.maxSpeed = this.maxRunSpeed;
        break;
      case this.states.shooting:
        police.gotoAndStop(0);
        break;
      case this.states.attacking:
        police.play();
        break;
    }
    police.state = state;
  },

  radioForBackup(police) {
    
    var closestPolice = false;
    var closestDistance = 2000;

    for (var i=0; i < this.police.length; i++) {
      if (!this.police[i].dead && (!this.police[i].zombieTarget || this.police[i].zombieTarget.dead)) {
        var distance = fastDistance(police.x, police.y, this.police[i].x, this.police[i].y);
        if (distance < closestDistance) {
          closestPolice = this.police[i];
          closestDistance = distance;
        }
      }
    }

    if (closestPolice) {
      closestPolice.zombieTarget = police.zombieTarget;
      Exclamations.newRadio(police);
      Exclamations.newRadio(closestPolice);
      police.radioTime = this.radioTime;
      closestPolice.radioTime = this.radioTime;
    }
  },

  updatePolice(police, timeDiff, aliveZombies) {
    
    if (police.dead)
      return Humans.updateDeadHumanFading(police, timeDiff);

    police.attackTimer -= timeDiff;
    police.timeToScan -= timeDiff;
    police.radioTime -= timeDiff;

    if (police.infected)
      Humans.updatePlague(police, timeDiff);

    if ((!police.zombieTarget || police.zombieTarget.dead) && police.timeToScan < 0) {
      Humans.scanForZombies(police, aliveZombies);
      if (police.zombieTarget && !police.zombieTarget.dead) {
        if (police.radioTime < 0)
          this.radioForBackup(police);
      }
    }

    this.decideStateOnZombieDistance(police);

    switch (police.state) {

      case this.states.standing:
        police.timeStanding -= timeDiff;
        if (police.timeStanding < 0) {
          Humans.assignRandomTarget(police);
          this.changeState(police, this.states.walking);
        }

        break;
      case this.states.walking:

        if (fastDistance(police.position.x, police.position.y, police.target.x, police.target.y) < this.moveTargetDistance) {
          police.target = false;
          police.zombieTarget = false;
          police.timeStanding = Humans.randomSecondsToStand();
          this.changeState(police, this.states.standing);
        } else {
          Humans.updateHumanSpeed(police, timeDiff);
        }

        break;
      case this.states.running:

        if (police.zombieTarget && !police.zombieTarget.dead) {
          if (police.target) {
            Humans.updateHumanSpeed(police, timeDiff);
          }
        } else {
          this.changeState(police, this.states.standing);
        }
        break;
      case this.states.attacking:
        if (police.zombieTarget && !police.zombieTarget.dead) {
          police.scale.x = police.zombieTarget.x > police.x ? this.scaling : -this.scaling;
          if (police.attackTimer < 0) {
            Zombies.damageZombie(police.zombieTarget, this.attackDamage, police);
            police.attackTimer = this.attackSpeed;
          }
        } else {
          this.changeState(police, this.states.standing);
        }

        break;
      case this.states.shooting:
        if (police.zombieTarget && !police.zombieTarget.dead) {
          police.scale.x = police.zombieTarget.x > police.x ? this.scaling : -this.scaling;
          if (police.attackTimer < 0) {
            Bullets.newBullet(police.x, police.y, police.zombieTarget, this.attackDamage);
            police.attackTimer = this.attackSpeed;
          }
        } else {
          this.changeState(police, this.states.standing);
        }

        break;
    }
  }
}

Army = {
  map:Map,
  maxWalkSpeed : 20,
  maxRunSpeed : 50,
  armymen : [],
  discardedArmymen : [],
  walkTexture : [],
  deadTexture :[],
  armyPerLevel : 0.5,
  attackSpeed : 2,
  attackDamage : 20,
  attackDistance : 25,
  moveTargetDistance : 5,
  shootDistance : 120,
  visionDistance : 200,
  scaling :2,
  shotsPerBurst : 3,
  droneStrikeTimer : 0,
  droneStrikeTime : 30,

  states : {
    shooting : "shooting",
    attacking : "attacking",
    walking : "walking",
    running : "running",
    standing : "standing"
  },

  getMaxArmy() {
    var maxArmy = Math.min(Math.round(this.armyPerLevel * GameModel.level), 100);

    if (GameModel.level < 8)
      return 0;

    return maxArmy;
  },

  getMaxHealth() {
    return Math.round(Humans.getMaxHealth(GameModel.level) * 1);
  },

  getAttackDamage() {
    this.attackDamage = Math.round(this.getMaxHealth() / 10);
  },

  populate() {
    if (this.walkTexture.length == 0) {
      for (var i=0; i < 3; i++) {
        this.walkTexture.push(PIXI.Texture.from('army' + (i + 1) + '.png'))
      }
      this.deadTexture = [PIXI.Texture.from('army4.png')];
    }

    if (this.armymen.length > 0) {
      for (var i=0; i < this.armymen.length; i++) {
        characterContainer.removeChild(this.armymen[i]);
      }
      this.discardedArmymen = this.armymen.slice();
      this.armymen = [];
    }

    var maxArmy = this.getMaxArmy();
    var maxHealth = this.getMaxHealth();
    this.getAttackDamage();

    this.droneStrike = false;
    this.droneStrikeTimer = Math.random() * this.droneStrikeTime;
    this.droneActive = GameModel.level >= 25;
  
    for (var i=0; i < maxArmy; i++) {
      var armyman;
      if (this.discardedArmymen.length > 0) {
        armyman = this.discardedArmymen.pop();
        armyman.alpha = 1;
        armyman.textures = this.walkTexture;
      } else {
        armyman = new PIXI.AnimatedSprite(this.walkTexture);
      }
      armyman.deadTexture = this.deadTexture;
      armyman.animationSpeed = 0.2;
      armyman.anchor = {x:35/80,y:1};
      armyman.currentPoi = this.map.getRandomBuilding();
      armyman.position = this.map.randomPositionInBuilding(armyman.currentPoi);
      armyman.zIndex = armyman.position.y;
      armyman.xSpeed = 0;
      armyman.ySpeed = 0;
      armyman.speedMod = 1;
      armyman.dead = false;
      armyman.infected = false;
      armyman.lastKnownBuilding = false;
      armyman.plagueDamage = 0;
      armyman.plagueTickTimer = Math.random() * Humans.plagueTickTimer;
      armyman.maxSpeed = this.maxWalkSpeed;
      armyman.visionDistance = this.visionDistance;
      armyman.visible = true;
      armyman.maxHealth = armyman.health = maxHealth;
      armyman.timeToScan = Math.random() * Humans.scanTime;
      armyman.timeStanding = Math.random() * Humans.randomSecondsToStand();
      armyman.target = false;
      armyman.zombieTarget = false;
      armyman.state = this.states.standing;
      armyman.attackTimer = this.attackSpeed;
      armyman.scale = {x:Math.random() > 0.5 ? this.scaling : -1 * this.scaling, y:this.scaling};
      this.armymen.push(armyman);
      characterContainer.addChild(armyman);
    }
  },

  update(timeDiff, aliveZombies) {
    if (this.droneActive) {
      this.droneStrikeTimer -= timeDiff;
    }
    for (var i=0; i < this.armymen.length; i++) {
      this.updateArmy(this.armymen[i], timeDiff, aliveZombies);
      if (!this.armymen[i].dead)
        Humans.aliveHumans.push(this.armymen[i]);
    }
    this.updateDroneStrike(timeDiff, aliveZombies);
  },

  decideStateOnZombieDistance(armyman) {
    if (armyman.zombieTarget && !armyman.zombieTarget.dead) {
      armyman.target = armyman.zombieTarget;
      var distanceToTarget = fastDistance(armyman.position.x, armyman.position.y, armyman.zombieTarget.x, armyman.zombieTarget.y);

      if (distanceToTarget > this.shootDistance) {
        this.changeState(armyman, this.states.running);
        return;
      }

      if (distanceToTarget < this.attackDistance) {
        this.changeState(armyman, this.states.attacking);
        return;
      }
      this.changeState(armyman, this.states.shooting);
    }
  },

  changeState(armyman, state) {
    switch(state) {
      case this.states.standing:
          armyman.gotoAndStop(0);
        break;
      case this.states.walking:
          armyman.play();
          armyman.maxSpeed = this.maxWalkSpeed;
        break;
      case this.states.running:
          armyman.play();
          armyman.maxSpeed = this.maxRunSpeed;
        break;
      case this.states.shooting:
          armyman.gotoAndStop(0);
        break;
      case this.states.attacking:
          armyman.play();
        break;
    }
    armyman.state = state;
  },

  updateArmy(armyman, timeDiff, aliveZombies) {
    
    if (armyman.dead)
      return Humans.updateDeadHumanFading(armyman, timeDiff);

    armyman.attackTimer -= timeDiff;
    armyman.timeToScan -= timeDiff;

    if (armyman.infected)
      Humans.updatePlague(armyman, timeDiff);

    if ((!armyman.zombieTarget || armyman.zombieTarget.dead) && armyman.timeToScan < 0) {
      var zombies = Humans.scanForZombies(armyman, aliveZombies);
      if (zombies > 3 && this.droneActive && this.droneStrikeTimer < 0) {
        this.callDroneStrike(armyman, aliveZombies);
      }
    }

    this.decideStateOnZombieDistance(armyman);

    switch (armyman.state) {

      case this.states.standing:
        armyman.timeStanding -= timeDiff;
        if (armyman.timeStanding < 0) {
          Humans.assignRandomTarget(armyman);
          this.changeState(armyman, this.states.walking);
        }

        break;
      case this.states.walking:

        if (fastDistance(armyman.position.x, armyman.position.y, armyman.target.x, armyman.target.y) < this.moveTargetDistance) {
          armyman.target = false;
          armyman.zombieTarget = false;
          armyman.timeStanding = Humans.randomSecondsToStand();
          this.changeState(armyman, this.states.standing);
        } else {
          Humans.updateHumanSpeed(armyman, timeDiff);
        }

        break;
      case this.states.running:
        if (armyman.zombieTarget && !armyman.zombieTarget.dead) {
          Humans.updateHumanSpeed(armyman, timeDiff);
        } else {
          this.changeState(armyman, this.states.standing);
        }
        break;
      case this.states.attacking:
        if (armyman.zombieTarget && !armyman.zombieTarget.dead) {
          armyman.scale.x = armyman.zombieTarget.x > armyman.x ? this.scaling : -this.scaling;
          if (armyman.attackTimer < 0) {
            Zombies.damageZombie(armyman.zombieTarget, this.attackDamage, armyman);
            armyman.attackTimer = this.attackSpeed;
          }
        } else {
          this.changeState(armyman, this.states.standing);
        }

        break;
      case this.states.shooting:
        if (armyman.zombieTarget && !armyman.zombieTarget.dead) {
          armyman.scale.x = armyman.zombieTarget.x > armyman.x ? this.scaling : -this.scaling;
          if (armyman.attackTimer < 0) {
            armyman.shotsLeft = this.shotsPerBurst;
            armyman.attackTimer = this.attackSpeed;
            armyman.shotTimer = 0;
          }
          if (armyman.shotsLeft > 0) {
            armyman.shotTimer -= timeDiff;
            if (armyman.shotTimer < 0) {
              armyman.shotTimer = 0.15;
              Bullets.newBullet(armyman.x, armyman.y, armyman.zombieTarget, this.attackDamage);
              armyman.shotsLeft--;
            }
          }
        } else {
          this.changeState(armyman, this.states.standing);
        }

        break;
    }
  },

  droneBlastRadius : 35,

  callDroneStrike(armyman, aliveZombies) {

    var zombiesInArea = 0;
    for (var i = 0; i < aliveZombies.length; i++) {
      if (aliveZombies[i].x > armyman.zombieTarget.x - this.droneBlastRadius && aliveZombies[i].x < armyman.zombieTarget.x + this.droneBlastRadius) {
        if (aliveZombies[i].y > armyman.zombieTarget.y - this.droneBlastRadius && aliveZombies[i].y < armyman.zombieTarget.y + this.droneBlastRadius) {
          zombiesInArea++;
        }
      }
    }
    var humansInArea = 0;
    var aliveHumans = Humans.aliveHumans;
    for (var i = 0; i < aliveHumans.length; i++) {
      if (aliveHumans[i].x > armyman.zombieTarget.x - this.droneBlastRadius && aliveHumans[i].x < armyman.zombieTarget.x + this.droneBlastRadius) {
        if (aliveHumans[i].y > armyman.zombieTarget.y - this.droneBlastRadius && aliveHumans[i].y < armyman.zombieTarget.y + this.droneBlastRadius) {
          humansInArea++;
        }
      }
    }

    if (zombiesInArea > 1 && humansInArea == 0) {
      Exclamations.newRadio(armyman);
      this.droneStrikeTimer = this.droneStrikeTime;
      this.droneStrike = {
        caller:armyman,
        target:armyman.zombieTarget,
        timer:3,
        bombsLeft:3
      }
    }
  },

  droneBomb(aliveZombies) {
    var variance = 16;
    var bombHit = {
      x:this.droneStrike.target.x - variance + (Math.random() *  variance * 2),
      y:this.droneStrike.target.y - variance + (Math.random() *  variance * 2)
    };
    Blasts.newDroneBlast(bombHit.x, bombHit.y);
    for (var i = 0; i < aliveZombies.length; i++) {
      if (aliveZombies[i].x > bombHit.x - this.droneBlastRadius && aliveZombies[i].x < bombHit.x + this.droneBlastRadius) {
        if (aliveZombies[i].y > bombHit.y - this.droneBlastRadius && aliveZombies[i].y < bombHit.y + this.droneBlastRadius) {
          Zombies.damageZombie(aliveZombies[i], this.attackDamage * 5);
        }
      }
    }
    this.droneStrike.timer = 0.3;
    this.droneStrike.bombsLeft--;
  },

  updateDroneStrike(timeDiff, aliveZombies) {
    if (this.droneStrike) {
      
      this.droneStrike.timer -= timeDiff;

      if (!this.droneStrike.startedBombing) {
        if (!this.droneStrike.text) {
          this.droneStrike.text = new PIXI.Text("3", {
            fontFamily: 'sans-serif',
            fontSize : 40,
            fill: "#F00",
            stroke: "#000",
            strokeThickness: 0,
            align: 'center'
          });
          this.droneStrike.text.anchor = {x:0.5, y:1};
          this.droneStrike.text.scale.x = 0.5;
          this.droneStrike.text.scale.y = 0.5;
          foregroundContainer.addChild(this.droneStrike.text)

          this.droneStrike.laser = new PIXI.Graphics();
          foregroundContainer.addChild(this.droneStrike.laser);
        }
        this.droneStrike.text.text = Math.ceil(this.droneStrike.timer);
        this.droneStrike.text.x = this.droneStrike.target.x;
        this.droneStrike.text.y = this.droneStrike.target.y - 30;

        this.droneStrike.laser.clear();
        this.droneStrike.laser.lineStyle(1, 0xFF0000);
        this.droneStrike.laser.moveTo(this.droneStrike.caller.x, this.droneStrike.caller.y - 10);
        this.droneStrike.laser.lineTo(this.droneStrike.target.x, this.droneStrike.target.y - 10);
      }

      if ((this.droneStrike.caller.dead || this.droneStrike.target.dead) && !this.droneStrike.startedBombing) {
        foregroundContainer.removeChild(this.droneStrike.text)
        foregroundContainer.removeChild(this.droneStrike.laser);
        this.droneStrike = false;
        this.droneStrikeTimer = 0;
        return;
      }
      
      if (this.droneStrike.timer < 0) {

        if (!this.droneStrike.startedBombing) {
          foregroundContainer.removeChild(this.droneStrike.text)
          foregroundContainer.removeChild(this.droneStrike.laser);
          this.droneStrike.startedBombing = true;
        }

        this.droneBomb(aliveZombies);

        if (this.droneStrike.bombsLeft <= 0) {
          this.droneStrike = false;
        }
      }
    }
  }

}