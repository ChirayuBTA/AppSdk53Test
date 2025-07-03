import React, { useState, useRef, ReactElement } from "react";
import {
  View,
  Modal,
  StyleSheet,
  TouchableWithoutFeedback,
  Dimensions,
} from "react-native";

interface DropdownMenuProps {
  trigger: (onPress: () => void) => React.ReactNode;
  children: React.ReactNode;
  dropdownWidth?: number;
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({
  trigger,
  children,
  dropdownWidth = 150,
}) => {
  const [visible, setVisible] = useState(false);
  const triggerRef = useRef<View>(null);
  const [position, setPosition] = useState({ x: 0, y: 0, width: 0 });
  const screenWidth = Dimensions.get("window").width;

  const handleOpen = () => {
    if (triggerRef.current) {
      triggerRef.current.measure((fx, fy, width, height, px, py) => {
        let adjustedX = px + width / 2 - dropdownWidth / 2;

        if (adjustedX + dropdownWidth > screenWidth) {
          adjustedX = screenWidth - dropdownWidth - 10;
        }

        if (adjustedX < 10) {
          adjustedX = 10;
        }

        setPosition({ x: adjustedX, y: py, width });
        setVisible(true);
      });
    }
  };

  const handleClose = () => setVisible(false);

  return (
    <View>
      <TouchableWithoutFeedback onPress={handleOpen}>
        <View ref={triggerRef}>{trigger(handleOpen)}</View>
      </TouchableWithoutFeedback>
      {visible && (
        <Modal transparent onRequestClose={handleClose}>
          <TouchableWithoutFeedback onPress={handleClose}>
            <View style={styles.modalOverlay}>
              <View
                style={[
                  styles.menu,
                  {
                    top: position.y,
                    left: position.x,
                    width: dropdownWidth,
                  },
                ]}
              >
                {React.Children.map(children, (child) =>
                  React.isValidElement(child)
                    ? React.cloneElement(
                        child as ReactElement<{ onClose: () => void }>,
                        { onClose: handleClose }
                      )
                    : child
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  menu: {
    position: "absolute",
    backgroundColor: "white",
    elevation: 5,
    borderRadius: 4,
    padding: 8,
  },
});

export default DropdownMenu;
