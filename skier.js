// skier.js

// Configuration settings
const cfg = {
    FPS: 40,
    SCREENSIZE: { width: 640, height: 640 },
    SKIER_IMAGE_PATHS: [
        '/resources/images/skier_forward.png',
        '/resources/images/skier_right1.png',
        '/resources/images/skier_right2.png',
        '/resources/images/skier_left2.png',
        '/resources/images/skier_left1.png',
        '/resources/images/skier_fall.png'
    ],
    OBSTACLE_PATHS: {
        'tree': '/resources/images/tree.png',
        'flag': '/resources/images/flag.png'
    },
    AUDIO_PATHS: {
        'bgm': '/resources/music/bgm.mp3',
        'get': '/resources/music/get.wav',
        'loss': '/resources/music/shit.mp3'
    },
    FONTPATH: '/resources/font/FZSTK.TTF'
};

// Skier class
class SkierClass extends Phaser.GameObjects.Sprite {
    constructor(scene) {
        super(scene, 320, 100, cfg.SKIER_IMAGE_PATHS[0]);
        this.scene = scene;
        this.direction = 0;
        this.imagepaths = cfg.SKIER_IMAGE_PATHS.slice(0, -1);
        this.setOrigin(0.5, 0.5);
        this.speed = [this.direction, 6 - Math.abs(this.direction) * 2];
        scene.add.existing(this);
    }

    turn(num) {
        this.direction += num;
        this.direction = Math.max(-2, Math.min(2, this.direction));

        const center = { x: this.x, y: this.y };
        this.setTexture(this.imagepaths[this.direction]);
        this.setPosition(center.x, center.y);
        this.speed = [this.direction, 6 - Math.abs(this.direction) * 2];
        return this.speed;
    }

    move() {
        this.x += this.speed[0];
        this.x = Math.max(20, Math.min(620, this.x));
    }

    setFall() {
        this.setTexture(cfg.SKIER_IMAGE_PATHS[cfg.SKIER_IMAGE_PATHS.length - 1]);
    }

    setForward() {
        this.direction = 0;
        this.setTexture(this.imagepaths[this.direction]);
    }
}

// Obstacle class
class ObstacleClass extends Phaser.GameObjects.Sprite {
    constructor(scene, img_path, location, attribute) {
        super(scene, location[0], location[1], img_path);
        this.scene = scene;
        this.attribute = attribute;
        this.passed = false;
        scene.add.existing(this);
    }

    move(num) {
        this.y -= num; // Move obstacle down by 'num' pixels
    }
}

// Create obstacles
function createObstacles(s, e, num = 10) {
    const obstacles = [];
    const locations = new Set();

    for (let i = 0; i < num; i++) {
        const row = Phaser.Math.Between(s, e);
        const col = Phaser.Math.Between(0, 9);
        const location = [col * 64 + 20, row * 64 + 20].toString();
        if (!locations.has(location)) {
            locations.add(location);
            const attribute = Phaser.Utils.Array.GetRandom(Object.keys(cfg.OBSTACLE_PATHS));
            const img_path = cfg.OBSTACLE_PATHS[attribute];
            const obstacle = new ObstacleClass(scene, img_path, [col * 64 + 20, row * 64 + 20], attribute);
            obstacles.push(obstacle);
        }
    }
    return obstacles;
}

// Add obstacles
function AddObstacles(obstacles0, obstacles1) {
    return obstacles0.concat(obstacles1);
}

// Show start interface
function ShowStartInterface(scene, screensize) {
    scene.cameras.main.setBackgroundColor('#FFFFFF');
    const title = scene.add.text(screensize.width / 2, screensize.height / 5, 'Skier Game', {
        font: `${screensize.width / 5}px FZSTK`,
        fill: '#FF0000'
    }).setOrigin(0.5, 0.5);
    
    const content = scene.add.text(screensize.width / 2, screensize.height / 2, 'Press any key to START', {
        font: `${screensize.width / 20}px FZSTK`,
        fill: '#0000FF'
    }).setOrigin(0.5, 0.5);
    
    return new Promise(resolve => {
        scene.input.keyboard.on('keydown', () => {
            resolve();
        });
    });
}

// Show score
function showScore(scene, score, pos = { x: 10, y: 10 }) {
    const scoreText = scene.add.text(pos.x, pos.y, `Score: ${score}`, {
        font: '30px FZSTK',
        fill: '#000000'
    });
    return scoreText;
}

// Update frame
function updateFrame(scene, obstacles, skier, score) {
    scene.cameras.main.setBackgroundColor('#FFFFFF');
    obstacles.forEach(obstacle => {
        obstacle.setVisible(true);
    });
    skier.setVisible(true);
    showScore(scene, score);
}

// Initialize game sounds
async function initGame() {
    const game_sounds = {};
    for (const [key, value] of Object.entries(cfg.AUDIO_PATHS)) {
        if (key === 'bgm') {
            continue; // Skip background music for now
        }
        try {
            const sound = new Audio(value);
            game_sounds[key] = sound;
        } catch (error) {
            console.warn(`Warning: Sound file ${value} not found.`);
            game_sounds[key] = null; // Handle missing sounds gracefully
        }
    }
    return game_sounds;
}

// Main game function
async function main() {
    const config = {
        type: Phaser.AUTO,
        width: cfg.SCREENSIZE.width,
        height: cfg.SCREENSIZE.height,
        scene: {
            preload: preload,
            create: create,
            update: update
        }
    };

    const game = new Phaser.Game(config);
    let game_sounds = await initGame(); // Load game sounds

    function preload() {
        // Load images and sounds here
        this.load.image('bgm', cfg.AUDIO_PATHS['bgm']); // Load background music
        cfg.SKIER_IMAGE_PATHS.forEach((path, index) => {
            this.load.image(`skier${index}`, path);
        });
        Object.keys(cfg.OBSTACLE_PATHS).forEach(key => {
            this.load.image(key, cfg.OBSTACLE_PATHS[key]);
        });
    }

    function create() {
        this.bgm = this.sound.add('bgm');
        this.bgm.setVolume(0.9);
        this.bgm.loop = true;
        this.bgm.play();

        ShowStartInterface(this, cfg.SCREENSIZE).then(() => {
            const skier = new SkierClass(this);
            let obstacles0 = createObstacles(20, 29);
            let obstacles1 = createObstacles(10, 19);
            let obstaclesflag = 0;
            let obstacles = AddObstacles(obstacles0, obstacles1);
            let distance = 0;
            let score = 0;
            let speed = [0, 6];

            this.input.keyboard.on('keydown', (event) => {
                if (event.key === 'ArrowLeft' || event.key === 'a') {
                    speed = skier.turn(-1);
                } else if (event.key === 'ArrowRight' || event.key === 'd') {
                    speed = skier.turn(1);
                }
            });

            this.time.addEvent({
                delay: 1000 / cfg.FPS,
                callback: () => {
                    skier.move();
                    distance += speed[1];

                    if (distance >= 640 && obstaclesflag === 0) {
                        obstaclesflag = 1;
                        obstacles0 = createObstacles(20, 29);
                        obstacles = AddObstacles(obstacles0, obstacles1);
                    }

                    if (distance >= 1280 && obstaclesflag === 1) {
                        obstaclesflag = 0;
                        distance -= 1280;
                        obstacles0.forEach(obstacle => {
                            obstacle.y -= 1280;
                        });
                        obstacles1 = createObstacles(10, 19);
                        obstacles = AddObstacles(obstacles0, obstacles1);
                    }

                    obstacles.forEach(obstacle => {
                        obstacle.move(distance);
                    });

                    const hitted_obstacles = obstacles.filter(obstacle => {
                        return Phaser.Geom.Intersects.RectangleToRectangle(skier.getBounds(), obstacle.getBounds());
                    });

                    if (hitted_obstacles.length > 0) {
                        const hitObstacle = hitted_obstacles[0];
                        if (hitObstacle.attribute === "tree" && !hitObstacle.passed) {
                            score -= 50;
                            skier.setFall();
                            if (game_sounds['loss']) game_sounds['loss'].play();
                            updateFrame(this, obstacles, skier, score);
                            this.time.delayedCall(1050, () => {
                                skier.setForward(); // Reset skier's position
                                speed = [0, 6]; // Reset speed
                                hitObstacle.passed = true; // Mark obstacle as passed
                            }, [], this);
                        } else if (hitObstacle.attribute === "flag" && !hitObstacle.passed) {
                            if (game_sounds['get']) game_sounds['get'].play(); // Play get sound
                            score += 10; // Increase score for hitting a flag
                            obstacles.splice(obstacles.indexOf(hitObstacle), 1); // Remove the flag from obstacles
                        }
                    }

                    updateFrame(this, obstacles, skier, score); // Update the game frame
                },
                loop: true
            });
        });
    }

    function update() {
        // Additional game update logic if needed
    }
}

// Start the game
main();
