import * as THREE from "three/webgpu";

export class CameraController{

    constructor(){
      this.rot = 0;
      this.ex_mouseX = 0;
      this.ex_mouseY = 0;
      this.dx = 0;
      this.dy = 0;
      
      this.r = 5;
      this.theta = -134.60000000000014;
      this.theta1 = -32.30000000000002;
      this.speed = 1.3;

      this.cameraLookAt = [7.527931433841992, 19.27113058118781, 20.201808747746842];
      this.cameraPos = [10.537173638522285, 21.942892328136942, 23.16932463163192];
      this.isMouseDonw = false;
      this.isKeyDonw = false;
      
    }

    mouseMove(event){
        if(!this.isMouseDonw){
        return;
      }

      this.dx = (event.pageX - this.ex_mouseX);
      this.dy = (event.pageY - this.ex_mouseY);


      this.theta += this.dx * 0.1;
      this.theta1 += this.dy * 0.1;
      this.theta1 = Math.max(-89, Math.min(89, this.theta1));

      this.cameraLookAt[0] = this.cameraPos[0] + this.r * Math.sin(this.theta * Math.PI / 180) * Math.cos(this.theta1 * Math.PI / 180);
      this.cameraLookAt[1] = this.cameraPos[1] + this.r * Math.sin((this.theta1 * Math.PI) / 180);
      this.cameraLookAt[2] = this.cameraPos[2] + this.r * Math.cos(this.theta * Math.PI / 180) * Math.cos(this.theta1 * Math.PI / 180);

      this.ex_mouseX = event.pageX;
      this.ex_mouseY = event.pageY;
    }

    keyMove(keys){

      if(!this.isKeyDonw) return;

      if(keys["w"]){
          this.cameraPos[0] += 0.1 * Math.sin(this.theta * Math.PI / 180) * Math.cos(this.theta1 * Math.PI / 180);
          this.cameraPos[1] += 0.1 * Math.sin((this.theta1 * Math.PI) / 180);
          this.cameraPos[2] += 0.1 * Math.cos(this.theta * Math.PI / 180) * Math.cos(this.theta1 * Math.PI / 180);

          this.cameraLookAt[0] += 0.1 * Math.sin(this.theta * Math.PI / 180) * Math.cos(this.theta1 * Math.PI / 180);
          this.cameraLookAt[1] += 0.1 * Math.sin((this.theta1 * Math.PI) / 180);
          this.cameraLookAt[2] += 0.1 * Math.cos(this.theta * Math.PI / 180) * Math.cos(this.theta1 * Math.PI / 180);
      }else if(keys["s"]){

          this.cameraPos[0] -= 0.1 * Math.sin(this.theta * Math.PI / 180) * Math.cos(this.theta1 * Math.PI / 180);
          this.cameraPos[1] -= 0.1 * Math.sin((this.theta1 * Math.PI) / 180);
          this.cameraPos[2] -= 0.1 * Math.cos(this.theta * Math.PI / 180) * Math.cos(this.theta1 * Math.PI / 180);

          this.cameraLookAt[0] -= 0.1 * Math.sin(this.theta * Math.PI / 180) * Math.cos(this.theta1 * Math.PI / 180);
          this.cameraLookAt[1] -= 0.1 * Math.sin((this.theta1 * Math.PI) / 180);
          this.cameraLookAt[2] -= 0.1 * Math.cos(this.theta * Math.PI / 180) * Math.cos(this.theta1 * Math.PI / 180);
      }else if(keys["a"]){

          const new_theta = this.theta;
          const new_theta1 = this.theta1;

          this.cameraPos[0] += 0.1 * Math.sin(new_theta * Math.PI / 180) * Math.cos(new_theta1 * Math.PI / 180);
          this.cameraPos[1] += 0.1 * Math.sin((new_theta1 * Math.PI) / 180);
          this.cameraPos[2] += 0.1 * Math.cos(new_theta * Math.PI / 180) * Math.cos(new_theta1 * Math.PI / 180);

          this.cameraLookAt[0] += 0.1 * Math.sin(new_theta * Math.PI / 180) * Math.cos(new_theta1 * Math.PI / 180);
          this.cameraLookAt[1] += 0.1 * Math.sin((new_theta1 * Math.PI) / 180);
          this.cameraLookAt[2] += 0.1 * Math.cos(new_theta * Math.PI / 180) * Math.cos(new_theta1 * Math.PI / 180);

        }else if(keys["d"]){

          const new_theta = this.theta - 90;
          const new_theta1 = 0;
          this.cameraPos[0] += 0.1 * Math.sin(new_theta * Math.PI / 180) * Math.cos(new_theta1 * Math.PI / 180);
          this.cameraPos[1] += 0.1 * Math.sin((new_theta1 * Math.PI) / 180);
          this.cameraPos[2] += 0.1 * Math.cos(new_theta * Math.PI / 180) * Math.cos(new_theta1 * Math.PI / 180);

          this.cameraLookAt[0] += 0.1 * Math.sin(new_theta * Math.PI / 180) * Math.cos(new_theta1 * Math.PI / 180);
          this.cameraLookAt[1] += 0.1 * Math.sin((new_theta1 * Math.PI) / 180);
          this.cameraLookAt[2] += 0.1 * Math.cos(new_theta * Math.PI / 180) * Math.cos(new_theta1 * Math.PI / 180);
      }else if(keys["e"]){
          this.cameraPos[1] += 0.1;
          this.cameraLookAt[1] += 0.1;
      }else if(keys["q"]){
          this.cameraPos[1] -= 0.1;
          this.cameraLookAt[1] -= 0.1;
      }else if(keys["g"]){
        this.getInformation();
      }
      
    }


    getInformation(){
        console.log("CameraPos", this.cameraPos[0], this.cameraPos[1], this.cameraPos[2]);
        console.log("cameraLookAt", this.cameraLookAt[0], this.cameraLookAt[1], this.cameraLookAt[2]);
        console.log("theta", this.theta);
        console.log("theta1", this.theta1);
    }

    update(camera){
        
        camera.lookAt(new THREE.Vector3(this.cameraLookAt[0], this.cameraLookAt[1], this.cameraLookAt[2]));
        camera.position.set(this.cameraPos[0], this.cameraPos[1], this.cameraPos[2]);
    }

}