import 'react-native';

// React Native 0.81.x uses mixed-in class typings (Constructor<NativeMethods> & typeof Component)
// which can fail JSX validation in `tsc` (TS2607/TS2786) under some TS/@types/react combos.
// This augmentation restores the minimum React.Component surface area that JSX expects.
declare module 'react-native' {
  interface Text {
    props: any;
    context: any;
    state: any;
    setState: any;
    forceUpdate: any;
    render: any;
  }

  interface View {
    props: any;
    context: any;
    state: any;
    setState: any;
    forceUpdate: any;
    render: any;
  }

  interface TextInput {
    props: any;
    context: any;
    state: any;
    setState: any;
    forceUpdate: any;
    render: any;
  }
}

export {};
